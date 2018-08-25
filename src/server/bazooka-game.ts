import World from '../protocol/world'
import gen from '../gen'
import config from '../config'
import { toCartesian } from '../math/coordinates'
import vox from '../protocol/vox'
import { VecXYZ, GameCmd, GameCmdSetVox, ObjSituation, GameStatus } from '../types'
import PlayerConn from './player-conn'
import Chunk from '../protocol/chunk'
import Player from '../protocol/obj/player-obj'
import GameObj from '../protocol/obj/game-obj'
import MissileObj from '../protocol/obj/missile-obj'
import PlayerObj from '../protocol/obj/player-obj'
import { simObjects } from '../protocol/physics'

const CB = config.CHUNK_BITS
const CS = config.CHUNK_SIZE
const PAD = 3
const PAD2 = 2 * PAD

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

  constructor() {
    this.playerConns = []
    this.world = new World()
    this.status = GameStatus.LOBBY
    this.objects = []
    this.nextObjKey = 0
    this.columnsToFall = []
  }

  generate() {
    console.log('generating island...')
    const genRad = config.BAZOOKA.GEN_RADIUS_CHUNKS
    for (let x = -CS * genRad; x < CS * genRad; x += CS) {
      for (let y = -CS * genRad; y < CS * genRad; y += CS) {
        const column = gen.generateColumn(x, y)
        for (let i = 0; i < column.chunks.length; i++) {
          this.world.addChunk(column.chunks[i])
        }
        for (let ix = 0; ix < CS; ix++) {
          for (let iy = 0; iy < CS; iy++) {
            const height = (column.heightMap[(ix + PAD) * (CS + PAD2) + iy + PAD] | 0) + 10 // extra for trees
            const distanceToCenter = Math.sqrt(Math.pow(x + ix, 2) + Math.pow(y + iy, 2))
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
    this.status = 'ACTIVE'
  }

  sendStatus() {
    const alive = this.getNumPlayersAlive()
    this.playerConns.forEach(playerConn => {
      playerConn.conn.sendStatus(this.status, alive, this.playerConns.length)
    })
  }

  addPlayer(playerConn: PlayerConn) {
    console.log('bazooka adding player %s', playerConn.id)
    this.playerConns.push(playerConn)
    playerConn.conn.on('update', obj => this._handleUpdate(playerConn, obj))

    if (this.status === GameStatus.LOBBY && this.playerConns.length === config.BAZOOKA.MAX_PLAYERS) {
      this.status = GameStatus.ACTIVE
      this.generate()
      this.sendStatus()
    }
  }

  removePlayer(id: string): void {
    const ix = this.playerConns.findIndex(c => c.id === id)
    console.log('bazooka removing player %s: %s', id, ix)
    if (ix < 0) return undefined
    this.playerConns.splice(ix, 1)[0]
    this.sendStatus()
  }

  getNumPlayersAlive() {
    let ret = 0
    this.playerConns.forEach(function(pc) {
      ret += pc.player.health > 0 ? 1 : 0
    })
    return ret
  }

  tick(tick: number, dt: number) {
    if (this.status === 'LOBBY') {
      return
    }
    // Kill players who fall
    this.playerConns.forEach(function(pc) {
      const loc = pc.player.location
      if (loc && loc.z < -100) {
        pc.conn.die(new Error('you fell'))
      }
    })

    this._simulate(dt) // TODO

    // this._makeColumnsFall(tick)

    this._updateObjects()
    this._updateChunks(tick)
  }

  _makeColumnsFall(tick: number) {
    const { ROUNDS, ROUND_LENGTH_TICKS, FALLING_LENGTH_TICKS } = config.CRUMBLING
    const totalColumns = this.columnsToFall.length
    const round = Math.floor(tick / ROUND_LENGTH_TICKS)
    const tickInRound = tick - round * ROUND_LENGTH_TICKS
    if (tickInRound > ROUND_LENGTH_TICKS - FALLING_LENGTH_TICKS) {
      const totalFallingTicks = ROUNDS * FALLING_LENGTH_TICKS
      const currentFallingTick =
        round * FALLING_LENGTH_TICKS + FALLING_LENGTH_TICKS - (ROUND_LENGTH_TICKS - tickInRound)
      const startIndex = ((currentFallingTick * totalColumns) / totalFallingTicks) | 0
      const endIndex = (((1 + currentFallingTick) * totalColumns) / totalFallingTicks) | 0

      for (let i = startIndex; i < endIndex; i++) {
        const column = this.columnsToFall[i]
        if (this.columnsToFall[i].height) {
          for (let z = -this.columnsToFall[i].height; z < this.columnsToFall[i].height; z++) {
            this.world.setVox(column.x, column.y, z, vox.INDEX.AIR)
          }
        }
      }
    }
  }

  _simulate(dt: number) {
    simObjects(this.objects, this.world, dt)

    let offset = 0
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i]
      if (obj.type === 'missile' && obj.situation === ObjSituation.IN_GROUND) {
        console.log('missile strike at ' + JSON.stringify(obj.location))
        offset++
        // TODO: block explosion
      } else {
        this.objects[i - offset] = this.objects[i]
      }
    }
    this.objects.length = this.objects.length - offset

    // TODO:
    // - check collision
    // - if shell/ground, crater
    // - if shell/player, inflict damage
    // - if block/trerain, bounce or stick1
    // - otherwise, fall
  }

  // Tell each player about objects around them, including other players
  _updateObjects() {
    // TODO: this runs in O(numConns ^ 2). Needs a better algorithm.
    const n = this.playerConns.length
    for (let i = 0; i < n; i++) {
      const pc = this.playerConns[i]
      const a = pc.player
      const objsToSend = [] as GameObj[]

      for (let j = 0; j < n; j++) {
        if (j === i) continue
        const pcb = this.playerConns[j]
        const b = pcb.player
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
        } as Player)
      }

      // Send missiles, etc
      for (let j = 0; j < this.objects.length; j++) {
        const object = this.objects[j]
        objsToSend.push(object)
      }

      pc.conn.sendObjects(objsToSend)
    }
  }

  // Tell each conn about the blocks around them. Send chunks where a voxel has changed.
  _updateChunks(tick: number) {
    // Figure out which conns need which chunks.
    // TODO: this runs in O(numConns * numChunks). Needs a better algorithm.
    const chunksToSend = [] as Chunk[][]
    for (let j = 0; j < this.playerConns.length; j++) {
      chunksToSend.push([])
    }
    let numMod = 0
    let numSending = 0
    const chunks = this.world.chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const wasDirty = chunk.dirty
      chunk.dirty = false
      numMod += wasDirty ? 1 : 0
      const key = chunk.getKey()
      for (let j = 0; j < this.playerConns.length; j++) {
        const pc = this.playerConns[j]
        const cts = chunksToSend[j]
        const loc = pc.player.location
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
    for (let j = 0; j < this.playerConns.length; j++) {
      this.playerConns[j].conn.sendChunks(chunksToSend[j])
    }
  }

  _handleUpdate(pc: PlayerConn, update: { player: PlayerObj; commands: GameCmd[] }) {
    // TODO: doing this 10x per second per client is not ideal. use binary.
    // TODO: validation
    if (!pc.player.name && update.player.name) {
      console.log('Player %s joined', update.player.name)
    }
    Object.assign(pc.player, update.player)

    if (update.commands.length === 0) return
    console.log('update from ' + pc.id + ', ' + update.commands.length + ' cmds')
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
    const dir = pc.player.direction
    const vel = toCartesian(dir.azimuth, dir.altitude + 0.5, 15)

    const key = 'missile-' + ++this.nextObjKey
    const missile = new MissileObj(key)
    missile.location = pc.player.location
    missile.velocity = { x: vel[0], y: vel[1], z: vel[2] }

    this.objects.push(missile)
  }
}

function isInRange(a: VecXYZ, b: VecXYZ) {
  const dx = (b.x >> CB) - (a.x >> CB)
  const dy = (b.y >> CB) - (a.y >> CB)
  const dz = (b.z >> CB) - (a.z >> CB)
  const r2 = dx * dx + dy * dy + dz * dz
  const rmax = config.SERVER.CHUNK_SEND_RADIUS
  return r2 < rmax * rmax
}

export default BazookaGame
