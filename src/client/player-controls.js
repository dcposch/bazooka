var config = require('../config')
var env = require('./env')
var vox = require('../vox')
// var HUD = require('./models/hud')
var vec3 = {
  create: require('gl-vec3/create')
}

var shell = env.shell

module.exports = {
  navigate: navigate,
  look: look,
  interact: interact
}

// Lets the player place and break blocks
// TODO: let the player interact with items
function interact (state) {
  var p = state.player

  if (shell.wasDown('1')) {
    dbgSpawnBlocks(state)
  }

  if (shell.press('9')) p.camera = p.camera === 'first-person' ? 'third-person' : 'first-person'

  if (shell.press('0')) state.debug.showHUD = !state.debug.showHUD

  var left = shell.wasDown('mouse-left')
  var right = shell.wasDown('mouse-right')
  var shift = shell.wasDown('shift')
  if (right || (shift && left)) return breakBlock(state)
  else if (left) return placeBlock(state)
}

function dbgSpawnBlocks (state) {
  state.fallingBlocks = []
  for (var i = 0; i < 100; i++) {
    var loc = {
      x: Math.random() * 20 - 10,
      y: Math.random() * 20 - 10,
      z: Math.random() * 20 + 100
    }
    state.fallingBlocks.push({
      location: loc,
      velocity: {
        x: loc.x + Math.random() * 6 - 3,
        y: loc.x + Math.random() * 6 - 3,
        z: 0
      },
      rotAxis: dbgRandomRotAxis(),
      rotTheta: 0,
      rotVel: Math.random() * 5,
      typeIndex: Math.random() < 0.5 ? vox.INDEX.STONE : vox.INDEX.BROWN
    })
  }
}

function dbgRandomRotAxis () {
  var ret = vec3.create()
  ret[0] = Math.random()
  ret[1] = Math.random()
  ret[2] = Math.random()
  var det = Math.sqrt(ret[0], ret[1], ret[2])
  ret[0] /= det
  ret[1] /= det
  ret[2] /= det
  return ret
}

// Let the player move
function navigate (player, dt) {
  var loc = player.location
  var dir = player.direction
  var vel = player.velocity

  // Directional input (WASD) always works
  vel.x = 0
  vel.y = 0
  if (shell.wasDown('nav-forward')) move(vel, 1, dir.azimuth, 0)
  if (shell.wasDown('nav-back')) move(vel, 1, dir.azimuth + Math.PI, 0)
  if (shell.wasDown('nav-left')) move(vel, 1, dir.azimuth + Math.PI * 0.5, 0)
  if (shell.wasDown('nav-right')) move(vel, 1, dir.azimuth + Math.PI * 1.5, 0)
  var speed = shell.wasDown('nav-sprint') ? config.SPEED_SPRINT : config.SPEED_WALK
  if (vel.x !== 0 || vel.y !== 0) {
    var norm = Math.sqrt(vel.x * vel.x + vel.y * vel.y)
    vel.x *= speed / norm
    vel.y *= speed / norm
  }
  loc.x += vel.x * dt
  loc.y += vel.y * dt

  // Jumping (space) only works if we're on solid ground
  if (shell.wasDown('nav-jump') && player.situation === 'on-ground') {
    vel.z = shell.wasDown('nav-sprint') ? config.SPEED_SPRINT_JUMP : config.SPEED_JUMP
    player.situation = 'airborne'
  }
}

// Modify vector {x, y, z} by adding a vector in spherical coordinates
function move (v, r, azimuth, altitude) {
  v.x += Math.cos(azimuth) * Math.cos(altitude) * r
  v.y += Math.sin(azimuth) * Math.cos(altitude) * r
  v.z += Math.sin(altitude) * r
}

// Let the player look around
function look (player) {
  var dx = shell.mouseX - shell.prevMouseX
  var dy = shell.mouseY - shell.prevMouseY
  var dir = player.direction
  var pi = Math.PI
  dir.azimuth -= dx * config.MOUSE_SENSITIVITY
  dir.azimuth = (dir.azimuth + 2 * pi) % (2 * pi) // Wrap to [0, 2pi)
  dir.altitude -= dy * config.MOUSE_SENSITIVITY
  dir.altitude = Math.min(0.5 * pi, Math.max(-0.5 * pi, dir.altitude)) // Clamp to [-pi/2, pi/2]
}

// Place a block onto the block face we're looking at
// TODO: rate limit
function placeBlock (state) {
  var block = state.player.lookAtBlock
  if (!block) return
  var loc = block.location
  var side = block.side
  var bx = loc.x + side.nx
  var by = loc.y + side.ny
  var bz = loc.z + side.nz

  // Don't let the player place a block where they're standing
  var p = state.player.location
  var intersectsPlayer =
    bx === Math.floor(p.x) &&
    by === Math.floor(p.y) &&
    [0, -1].includes(bz - Math.floor(p.z))
  if (intersectsPlayer) return

  return setBlock(state, bx, by, bz, state.player.placing)
}

// Break the block we're looking at
function breakBlock (state) {
  var block = state.player.lookAtBlock
  if (!block) return

  var loc = block.location
  var neighbors = [
    state.world.getVox(loc.x + 1, loc.y, loc.z),
    state.world.getVox(loc.x, loc.y + 1, loc.z),
    state.world.getVox(loc.x - 1, loc.y, loc.z),
    state.world.getVox(loc.x, loc.y - 1, loc.z),
    state.world.getVox(loc.x, loc.y, loc.z + 1)
  ]
  var v = neighbors.includes(vox.INDEX.WATER) ? vox.INDEX.WATER : vox.INDEX.AIR

  return setBlock(state, loc.x, loc.y, loc.z, v)
}

function setBlock (state, x, y, z, v) {
  // TODO: move prediction to its own file
  state.world.setVox(x, y, z, v)
  return {type: 'set', x: x, y: y, z: z, v: v}
}
