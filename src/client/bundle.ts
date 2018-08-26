import vec3 from 'gl-vec3'

import playerControls from './player-controls'
import { simObjects } from '../protocol/physics'
import picker from './picker'
import mesher from './mesher'
import Socket from './socket'
import config from '../config'
import World from '../protocol/world'
import ChunkIO from '../protocol/chunk-io'
import textures from './textures'
import splash from './splash'

// Find the canvas, initialize regl and game-shell
import env from './env'

// Precompile regl commands
import drawScope from './draw/draw-scope'
import drawHitMarker from './draw/draw-hit-marker'
import drawWorld from './draw/draw-world'
// import drawDebug from './draw/draw-debug'
import drawFallingBlocks from './draw/draw-falling-blocks'
import drawHud from './draw/draw-hud'
import drawSky from './draw/draw-sky'
import drawPlayers from './draw/draw-players'
import drawMissiles from './draw/draw-missiles'

import { PlayerMode, CameraMode, GameState, GameMsgConfig, GameMsgObjects, GameStatus, ObjType } from '../types'
import { Vec3, DefaultContext } from 'regl'
import FallingBlockObj from '../protocol/obj/falling-block-obj'
import GameObj from '../protocol/obj/game-obj'
import PlayerObj from '../protocol/obj/player-obj'
import MissileObj from '../protocol/obj/missile-obj'

// All game state lives here
var state: GameState = {
  startTime: 0,
  paused: true,

  cameraMode: CameraMode.FIRST_PERSON,
  cameraLoc: vec3.clone([10, 0, 100]) as Vec3,
  lookAtBlock: undefined,

  player: new PlayerObj('', ''),

  pendingCommands: [],
  pendingChunkUpdates: [],

  perf: {
    lastFrameTime: new Date().getTime(),
    fps: 0,
    draw: { chunks: 0, verts: 0 },
  },
  debug: {
    // Player can toggle the debug display
    showHUD: true,
  },

  gameStatus: GameStatus.LOBBY,

  objects: {},

  world: new World(),
  socket: new Socket(),
  config: undefined,
  error: undefined,
  alivePlayers: 0,
  totalPlayers: 0,
}

main()

function main() {
  splash.init(state)
  loadTextures()
  initWebsocket()

  // Game loop:
  env.shell.on('tick', tick)
  env.regl.frame(frame)

  // For debugging
  ;(window as any).state = state
  ;(window as any).config = config
  // splash.startGame()
}

function loadTextures() {
  // Load resources
  textures.loadAll(function(err: Error) {
    if (err) splash.showError('failed to load textures', err)
  })
}

function initWebsocket() {
  // Handle server messages
  state.socket.on('binary', function(msg: ArrayBuffer) {
    state.pendingChunkUpdates = ChunkIO.read(msg)
    console.log('Read %d chunks, %s KB', state.pendingChunkUpdates.length, msg.byteLength >> 10)
  })

  state.socket.on('json', function(msg) {
    switch (msg.type) {
      case 'handshake':
        break
      case 'config':
        return handleConfig(msg)
      case 'objects':
        return handleObjects(msg)
      case 'error':
        return splash.showError(msg.error.message)
      case 'status': {
        let shouldStart = false
        if (state.gameStatus === GameStatus.LOBBY && msg.gameStatus === GameStatus.ACTIVE) {
          shouldStart = true
        }

        state.gameStatus = msg.gameStatus
        state.alivePlayers = msg.alivePlayers
        state.totalPlayers = msg.totalPlayers

        splash.updatePlayers(state.totalPlayers, config.BAZOOKA.MAX_PLAYERS)

        if (shouldStart) {
          splash.startGame()
        }
        return
      }
      default:
        console.error('Ignoring unknown message type ' + msg.type)
    }
  })

  state.socket.on('close', function() {
    splash.showError('connection lost')
  })
}

function handleConfig(msg: GameMsgConfig) {
  state.config = msg.config
}

function handleObjects(msg: GameMsgObjects) {
  // TODO: client-server time diff
  var keys = {} as { [key: string]: boolean }

  // Create and update new objects
  msg.objects.forEach(function(newObj: GameObj) {
    keys[newObj.key] = true
    var obj = state.objects[newObj.key]
    if (!obj) {
      console.log('creating obj ' + newObj.key)
      obj = state.objects[newObj.key] = createObject(newObj)
    }
    Object.assign(obj, newObj)

    if (obj.key == msg.playerKey) {
      state.player = obj as PlayerObj
    }
  })

  // Delete objects that no longer exist or are too far away
  Object.keys(state.objects).forEach(function(key) {
    if (keys[key]) return
    console.log('deleting obj ' + key)
    delete state.objects[key]
  })
}

function createObject(obj: GameObj): GameObj {
  switch (obj.type) {
    case ObjType.PLAYER:
      return new PlayerObj(obj.key, (obj as PlayerObj).name)
    case ObjType.FALLING_BLOCK:
      return new FallingBlockObj(obj.key)
    case ObjType.MISSILE:
      return new MissileObj(obj.key)

    default:
      throw new Error('unrecognized object type ' + obj.type)
  }
}

// Runs regularly, independent of frame rate
function tick() {
  env.resizeCanvasIfNeeded()
  if (state.error) return

  var startMs = new Date().getTime()

  // Block interactions
  picker.pick(state)
  if (!state.paused) {
    const command = playerControls.interact(state)
    if (command) state.pendingCommands.push(command)
  }

  // Client / server
  playerControls.navigate
  if (state.socket.isReady() && state.player.key !== '') {
    const input = playerControls.navigate(state.player)
    if (input) {
      // console.log('WTF INPUT ' + JSON.stringify(input))
      state.player.input = input
    }

    state.socket.send({
      type: 'update',
      player: state.player,
      commands: state.pendingCommands,
    })
    state.pendingCommands.length = 0
  }

  var elapsedMs = Math.round(new Date().getTime() - startMs)
  if (elapsedMs > 1000 * config.TICK_INTERVAL) console.log('Slow tick: %d ms', elapsedMs)
}

// Renders each frame. Should run at 60Hz.
// Stops running if the canvas is not visible, for example because the window is minimized.
function frame(context: DefaultContext) {
  // Track FPS
  var nowMs = new Date().getTime()
  var dt = Math.max(nowMs - state.perf.lastFrameTime, 1) / 1000
  state.perf.fps = 0.99 * state.perf.fps + 0.01 / dt // Exponential moving average
  state.perf.lastFrameTime = nowMs
  state.paused = !env.shell.fullscreen

  // Update the terrain
  applyChunkUpdates()
  mesher.meshWorld(state.world, state.player.location)

  // If we're playing, update the objects too
  if (state.startTime <= 0 || state.world.chunks.length === 0) {
    return
  }

  // Handle player input, physics, update player position, direction, and velocity
  // If dt is too large, simulate in smaller increments
  // This prevents glitches like jumping through a block, getting stuck inside a block, etc
  // for (var t = 0.0; t < dt; t += config.PHYSICS.MAX_DT) {
  //   var stepDt = Math.min(config.PHYSICS.MAX_DT, dt - t)
  //   if (!state.paused) playerControls.navigate(state.player, stepDt)
  //   simPlayer(state.player, state.world, stepDt)
  // }
  simObjects(Object.values(state.objects), state.world, nowMs)

  if (!state.paused) playerControls.look(state.player)

  // Prediction: extrapolate object positions from latest server update
  // predictObjects(dt, now)

  // Draw the frame
  render()
}

// function predictObjects(dt: number, now: number) {
//   // Our own player object gets special treatment
//   // TODO: remove
//   var self = state.objects.self
//   self.location = state.player.location
//   self.velocity = state.player.velocity
//   self.direction = state.player.direction
//   self.name = state.player.name
//   self.mode = state.player.mode
//   // All other object positions are extrapolated from the latest server position + velocity
//   Object.keys(state.objects).forEach(function(key) {
//     if (key === 'self') return
//     var obj = state.objects[key]
//     // Don't extrapolate too far. If there's too much lag, it's better for objects to stop moving
//     // than to teleport through blocks.
//     if (obj.lastUpdateMs - now > config.MAX_EXTRAPOLATE_MS) return
//     var loc = obj.location
//     var vel = obj.velocity
//     if (obj.situation === 'airborne') vel.z -= config.PHYSICS.GRAVITY * dt
//     loc.x += vel.x * dt
//     loc.y += vel.y * dt
//     loc.z += vel.z * dt
//   })
// }

function render() {
  env.regl.clear({ color: [1, 1, 1, 1], depth: 1 })
  if (!drawScope) return
  drawScope(state, function() {
    drawSky(state.cameraLoc)

    // Draw objects
    const objs = Object.values(state.objects)
    drawFallingBlocks(objs.filter(o => o.type === ObjType.FALLING_BLOCK) as FallingBlockObj[])
    drawPlayers(objs.filter(o => o.type === ObjType.PLAYER) as PlayerObj[])
    drawMissiles(objs.filter(o => o.type === ObjType.MISSILE) as MissileObj[])

    drawWorld(state)
  })
  drawHud({
    mode: state.player.mode,
    health: 30,
    numPlayersLeft: 17,
    gameStatus: state.gameStatus,
    bazookaJuice: state.player.bazookaJuice,
  })
  // if (state.debug.showHUD) {
  //   drawDebug({ gameState: state })
  // }
  if (state.cameraMode === CameraMode.FIRST_PERSON && state.player.mode !== PlayerMode.BAZOOKA) {
    drawHitMarker({ color: [1, 1, 1, 0.5] })
  }
}

function applyChunkUpdates() {
  var chunks = state.pendingChunkUpdates
  if (chunks.length > 0) {
    chunks.forEach(function(chunk) {
      state.world.replaceChunk(chunk)
    })
    chunks.length = 0
    // TODO: prediction, so that blocks don't pop into and out of existence
  }
}
