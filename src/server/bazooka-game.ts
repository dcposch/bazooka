import World from '../world'
import gen from '../gen'
import config from '../config'
import { toCartesian } from '../math/geometry/coordinates'
import vox from '../vox'
import { VecXYZ } from '../types'
import PlayerConn from './player-conn'

const CB = config.CHUNK_BITS
const CS = config.CHUNK_SIZE
const PAD = 3
const PAD2 = 2 * PAD

interface GameObj {
  position: VecXYZ
  velocity: VecXYZ
}

interface GameCmd {
  type: string
}

interface GameCmdSetVox {
  type: 'set'
  x: number
  y: number
  z: number
  v: number
}

// Represents one Bazooka City game.
// Battle royale. Players land on a procgen voxel sky island and fight until one is left.
//
// Responsible for:
// - Managing game lifecycle, from LOBBY to ACTIVE to COMPLETED
// - Generating the island
// - Slowly disintegrating the island so it gets smaller and smaller over time
// - Enforcing game rules, calculating physics
// - Knowing how many players are left (LOBBY / ACTIVE) or who won (COMPLETED)
// - Sending or receiving messages. See api.js for low level details.
class BazookaGame {
  playerConns: PlayerConn[]
  world: World
  status: string

  objects: GameObj[]
  nextObjKey: number

  columnsToFall: Array<any>
  missiles: Array<any>

  constructor() {
    this.playerConns = []
    this.world = new World()
    this.status = 'ACTIVE'
    this.objects = []
    this.nextObjKey = 0
    this.columnsToFall = []
    this.missiles = []
  }

  generate() {
    console.log('generating island...')
    var genRad = config.BAZOOKA.GEN_RADIUS_CHUNKS
    for (var x = -CS * genRad; x < CS * genRad; x += CS) {
      for (var y = -CS * genRad; y < CS * genRad; y += CS) {
        var column = gen.generateColumn(x, y)
        for (var i = 0; i < column.chunks.length; i++) {
          this.world.addChunk(column.chunks[i])
        }
        for (var ix = 0; ix < CS; ix++) {
          for (var iy = 0; iy < CS; iy++) {
            var height = (column.heightMap[(ix + PAD) * (CS + PAD2) + iy + PAD] | 0) + 10 // extra for trees
            var distanceToCenter = Math.sqrt(Math.pow(x + ix, 2) + Math.pow(y + iy, 2))
            if (height) {
              this.columnsToFall.push({
                x: x + ix,
                y: y + iy,
                height: height,
                distance: distanceToCenter,
              })
            }
          }
        }
      }
    }
    this.columnsToFall.sort(function(c1, c2) {
      return c2.distance - c1.distance
    })
    console.log('generated ' + this.world.chunks.length + ' chunks')
  }

  addPlayer(playerConn: PlayerConn) {
    console.log('bazooka adding player %s', playerConn.id)
    this.playerConns.push(playerConn)
    playerConn.conn.on('update', obj => this._handleUpdate(playerConn, obj))
  }

  removePlayer(id) {
    const ix = this.playerConns.findIndex(c => c.id === id)
    console.log('bazooka removing player %s: %s', id, ix)
    if (ix < 0) return undefined
    return this.playerConns.splice(ix, 1)[0]
  }

  getNumPlayersAlive() {
    var ret = 0
    this.playerConns.forEach(function(pc) {
      ret += pc.player.health > 0 ? 1 : 0
    })
    return ret
  }

  tick(tick: number) {
    // Kill players who fall
    this.playerConns.forEach(function(pc) {
      var loc = pc.player.location
      if (loc && loc.z < -100) pc.conn.die({ message: 'you fell' })
    })

    this._simulate(0.1) // TODO

    this._makeColumnsFall(tick)
    this._updateObjects()
    this._updateChunks(tick)
  }

  _makeColumnsFall(tick: number) {
    const firstTick = config.SERVER.FIRST_FALLING_TICK
    const lastTick = config.SERVER.LAST_FALLING_TICK
    if (tick < firstTick || tick >= lastTick) {
      return
    }
    var totalColumns = this.columnsToFall.length
    var startIndex = (((tick - firstTick) / (lastTick - firstTick)) * totalColumns) | 0
    var endIndex = (((tick + 1 - firstTick) / (lastTick - firstTick)) * totalColumns) | 0

    for (var i = startIndex; i < endIndex; i++) {
      var column = this.columnsToFall[i]
      if (this.columnsToFall[i].height) {
        for (var z = -this.columnsToFall[i].height; z < this.columnsToFall[i].height; z++) {
          this.world.setVox(column.x, column.y, z, vox.INDEX.AIR)
        }
      }
    }
  }

  _simulate(dt: number) {
    var n = this.objects.length
    for (var i = 0; i < n; i++) {
      var o = this.objects[i]
      // vec3.scaleAndAdd(m.location, m.location, m.velocity, dt)
      o.velocity.z = o.velocity.z - config.PHYSICS.GRAVITY * dt

      // TODO:
      // - check collision
      // - if shell/ground, crater
      // - if shell/player, inflict damage
      // - if block/trerain, bounce or stick1
      // - otherwise, fall
    }
  }

  // Tell each player about objects around them, including other players
  _updateObjects() {
    // TODO: this runs in O(numConns ^ 2). Needs a better algorithm.
    var n = this.playerConns.length
    for (var i = 0; i < n; i++) {
      var pc = this.playerConns[i]
      var a = pc.player
      var objsToSend = []

      for (var j = 0; j < n; j++) {
        if (j === i) continue
        var pcb = this.playerConns[j]
        var b = pcb.player
        if (!a.location || !b.location) continue
        if (!b.name) continue
        if (!isInRange(a.location, b.location)) continue

        objsToSend.push({
          // Common to all objects
          type: 'player',
          key: 'player-' + pcb.id,
          location: b.location,
          velocity: b.velocity,
          // Specific to the player object
          name: b.name,
          direction: b.direction,
          situation: b.situation,
        })
      }

      // Send missiles, etc
      for (j = 0; j < this.objects.length; i++) {
        var object = this.objects[j]
        objsToSend.push(object)
      }

      pc.conn.sendObjects(objsToSend)
    }
  }

  // Tell each conn about the blocks around them. Send chunks where a voxel has changed.
  _updateChunks(tick: number) {
    // Figure out which conns need which chunks.
    // TODO: this runs in O(numConns * numChunks). Needs a better algorithm.
    var chunksToSend = []
    for (var j = 0; j < this.playerConns.length; j++) {
      chunksToSend.push([])
    }
    var numMod = 0
    var numSending = 0
    var chunks = this.world.chunks
    for (var i = 0; i < chunks.length; i++) {
      var chunk = chunks[i]
      var wasDirty = chunk.dirty
      chunk.dirty = false
      numMod += wasDirty ? 1 : 0
      var key = chunk.getKey()
      for (j = 0; j < this.playerConns.length; j++) {
        var pc = this.playerConns[j]
        var cts = chunksToSend[j]
        var loc = pc.player.location
        if (!loc) continue
        if (!isInRange(loc, chunk)) continue // player too far away
        if (pc.chunksSent[key] && !wasDirty) continue // up-to-date
        cts.push(chunk)
        pc.chunksSent[key] = tick
        numSending++
      }
    }
    if (numMod > 0 || numSending > 0) console.log('chunk updates: sending %s, %s modified', numSending, numMod)

    // Send chunk updates
    for (j = 0; j < this.playerConns.length; j++) {
      this.playerConns[j].conn.sendChunks(chunksToSend[j])
    }
  }

  _handleUpdate(pc: PlayerConn, update: any) {
    // TODO: doing this 10x per second per client is not ideal. use binary.
    // TODO: validation
    if (!pc.player.name && update.player.name) {
      console.log('Player %s joined', update.player.name)
    }
    Object.assign(pc.player, update.player)

    update.commands.forEach((command: GameCmd) => {
      switch (command.type) {
        case 'set':
          return this._handleSet(command as GameCmdSetVox)
        case 'fire-bazooka':
          return this._handleFireBazooka(pc)
        default:
          console.error('Ignoring unknown command type ' + command.type)
      }
    })
  }

  _handleSet(cmd: GameCmdSetVox) {
    this.world.setVox(cmd.x, cmd.y, cmd.z, cmd.v)
  }

  _handleFireBazooka(pc: PlayerConn) {
    var dir = pc.player.direction
    var vel = toCartesian(dir.azimuth, dir.altitude, 15)
    var missile = {
      type: 'missile',
      key: 'missile-' + ++this.nextObjKey,
      location: pc.player.location,
      velocity: { x: vel[0], y: vel[1], z: vel[2] },
    }

    this.missiles.push(missile)
  }
}

function isInRange(a: VecXYZ, b: VecXYZ) {
  var dx = (b.x >> CB) - (a.x >> CB)
  var dy = (b.y >> CB) - (a.y >> CB)
  var dz = (b.z >> CB) - (a.z >> CB)
  var r2 = dx * dx + dy * dy + dz * dz
  var rmax = config.SERVER.CHUNK_SEND_RADIUS
  return r2 < rmax * rmax
}

export default BazookaGame
