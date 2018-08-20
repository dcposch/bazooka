var playerControls = require('./player-controls')
var picker = require('./picker')
var mesher = require('./mesher')
var Socket = require('./socket')
var config = require('../config')
var World = require('../world')
var ChunkIO = require('../protocol/chunk-io')
var textures = require('./textures')
var splash = require('./splash')

// Find the canvas, initialize regl and game-shell
var env = require('./env')

// Precompile regl commands
var drawScope = require('./draw-scope')
var drawHitMarker = require('./draw-hit-marker')
var drawWorld = require('./draw-world')
var drawDebug = null // Created on-demand
var drawFallingBlocks = require('./models/falling-blocks')
var Player = require('./models/player')

// All game state lives here
var state = {
  startTime: 0,
  paused: true,
  player: {
    // Block coordinates of the player's head. +Z is up. When facing +X, +Y is left.
    location: { x: 0, y: 0, z: 100 },
    // Azimuth ranges from 0 (looking at +X) to 2*pi. Azimuth pi/2 looks at +Y.
    // Altitude ranges from -pi/2 (looking straight down) to pi/2 (up, +Z). 0 looks straight ahead.
    direction: { azimuth: 0, altitude: 0 },
    // Physics
    velocity: { x: 0, y: 0, z: 0 },
    // Situation can also be 'on-ground', 'suffocating'
    situation: 'airborne',
    // Which block we're looking at: {location: {x,y,z}, side: {nx,ny,nz}, voxel}
    lookAtBlock: null,
    // Camera can also be 'third-person'
    camera: 'third-person'
  },
  pendingCommands: [],
  pendingChunkUpdates: [],
  perf: {
    lastFrameTime: new Date().getTime(),
    fps: 0,
    draw: {chunks: 0, verts: 0}
  },
  debug: {
    // Player can toggle the debug display
    showHUD: true
  },
  objects: {},
  world: new World(),
  socket: new Socket(),
  config: null,
  error: null
}

// DBG:
var blocks = []
for (var i = 0; i < 100; i++) {
  blocks.push({
    location: { 
      x: Math.random() * 20 - 10,
      y: Math.random() * 20 - 10,
      z: Math.random() * 20 + 80
    },
    velocity: {
      x: 0, y: 0, z: 0
    },
    direction: {
      azimuth: Math.random(),
      altitude: Math.random()
    }
  })
}

main()

function main () {
  splash.init(state)
  loadTextures()
  initWebsocket()
  env.shell.on('tick', tick)
  env.regl.frame(frame)
  // For debugging
  window.state = state
  window.config = config
}

function loadTextures () {
  // Load resources
  textures.loadAll(function (err) {
    if (err) splash.showError('failed to load textures', err)
  })
}

function initWebsocket () {
  // Handle server messages
  state.socket.on('binary', function (msg) {
    state.pendingChunkUpdates = ChunkIO.read(msg)
    console.log('Read %d chunks, %s KB', state.pendingChunkUpdates.length, msg.byteLength >> 10)
  })

  state.socket.on('json', function (msg) {
    switch (msg.type) {
      case 'config':
        return handleConfig(msg)
      case 'objects':
        return handleObjects(msg)
      case 'error':
        return splash.showError(msg.error.message)
      default:
        console.error('Ignoring unknown message type ' + msg.type)
    }
  })

  state.socket.on('close', function () {
    splash.showError('connection lost')
  })
}

function handleConfig (msg) {
  state.config = msg.config
}

function handleObjects (msg) {
  var now = new Date().getTime()
  var keys = {}

  // Create and update new objects
  msg.objects.forEach(function (info) {
    keys[info.key] = true
    var obj = state.objects[info.key]
    if (!obj) obj = state.objects[info.key] = createObject(info)
    obj.location = info.location
    obj.direction = info.direction
    obj.velocity = info.velocity
    obj.situation = info.situation
    Object.assign(obj.props, info.props)
    obj.lastUpdateMs = now
  })

  // Delete objects that no longer exist or are too far away
  Object.keys(state.objects).forEach(function (key) {
    if (keys[key]) return
    if (key === 'self') return
    state.objects[key].destroy()
    delete state.objects[key]
  })
}

function createObject (info) {
  switch (info.type) {
    case 'player':
      return new Player(info.name)
    case 'block':
      return new FallingBlock()
    default:
      throw new Error('unrecognized object type ' + info.type)
  }
}

// Runs regularly, independent of frame rate
function tick () {
  env.resizeCanvasIfNeeded()
  if (state.error) return

  var startMs = new Date().getTime()

  // Block interactions
  picker.pick(state)
  var command = null
  if (!state.paused) command = playerControls.interact(state)
  if (command) state.pendingCommands.push(command)

  // Physics
  // TODO: block physics, update all active chunks

  // Client / server
  // TODO: enqueue actions to send to the server
  // TODO: create or modify any chunks we got from the server since the last tick
  // TODO: update player state if there's data from the server
  // TODO: update objects, other players, NPCs, etc if there's data from the server
  if (state.socket.isReady()) {
    state.socket.send({
      type: 'update',
      player: state.player,
      commands: state.pendingCommands
    })
    state.pendingCommands.length = 0
  }

  var elapsedMs = Math.round(new Date().getTime() - startMs)
  if (elapsedMs > 1000 * config.TICK_INTERVAL) console.log('Slow tick: %d ms', elapsedMs)
}

// Renders each frame. Should run at 60Hz.
// Stops running if the canvas is not visible, for example because the window is minimized.
function frame (context) {
  // Track FPS
  var now = new Date().getTime()
  var dt = Math.max(now - state.perf.lastFrameTime, 1) / 1000
  state.perf.fps = 0.99 * state.perf.fps + 0.01 / dt // Exponential moving average
  state.perf.lastFrameTime = now

  applyChunkUpdates()
  mesher.meshWorld(state.world, state.player.location)

  if (state.startTime > 0 && state.world.chunks.length > 0) {
    // Handle player input, physics, update player position, direction, and velocity
    playerControls.tick(state, dt, state.paused)
    // Prediction: extrapolate object positions from latest server update
    predictObjects(dt, now)
    // Draw the frame
    render(dt)
  }

  state.paused = !env.shell.fullscreen
}

function predictObjects (dt, now) {
  // Our own player object gets special treatment
  var self = state.objects.self
  self.location = state.player.location
  self.velocity = state.player.velocity
  self.props.direction = state.player.direction
  self.props.name = state.player.name

  // All other object positions are extrapolated from the latest server position + velocity
  Object.keys(state.objects).forEach(function (key) {
    if (key === 'self') return
    var obj = state.objects[key]
    // Don't extrapolate too far. If there's too much lag, it's better for objects to stop moving
    // than to teleport through blocks.
    if (obj.lastUpdateMs - now > config.MAX_EXTRAPOLATE_MS) return
    var loc = obj.location
    var vel = obj.velocity
    if (obj.situation === 'airborne') vel.z -= config.PHYSICS.GRAVITY * dt
    loc.x += vel.x * dt
    loc.y += vel.y * dt
    loc.z += vel.z * dt
  })
}

function render (dt) {
  env.regl.clear({ color: [1, 1, 1, 1], depth: 1 })
  if (!drawScope) return
  drawScope(state, function () {
    Object.keys(state.objects).forEach(function (key) {
      var obj = state.objects[key]
      obj.tick(dt)
      obj.draw()
    })
    drawWorld(state)
    drawFallingBlocks(blocks)
  })
  if (state.debug.showHUD) {
    if (!drawDebug) drawDebug = require('./draw-debug')
    drawDebug(state)
  }
  if (state.player.camera === 'first-person') {
    drawHitMarker({ color: [1, 1, 1, 0.5] })
  }
}

function applyChunkUpdates () {
  var chunks = state.pendingChunkUpdates
  if (chunks.length > 0) {
    chunks.forEach(function (chunk) {
      state.world.replaceChunk(chunk)
    })
    chunks.length = 0
    // TODO: prediction, so that blocks don't pop into and out of existence
  }
}
