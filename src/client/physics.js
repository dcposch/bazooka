var config = require('../config')

module.exports = {
  simulate: simulate
}

var EPS = 0.001
var PW = config.PLAYER_WIDTH
var PH = config.PLAYER_HEIGHT
var HORIZONTAL_COLLISION_DIRS = [
  [PW, 0, 0], [PW, 0, -1],
  [-PW, 0, 0], [-PW, 0, -1],
  [0, PW, 0], [0, PW, -1],
  [0, -PW, 0], [0, -PW, -1]
]

/**
 * Runs a single step of the physics simulation.
 *
 * Moves objects, checks for collisions, updates their velocities and states.
 */
function simulate (state, dt) {
  // TODO: loop thru objects
  // TODO: move to common
  simPlayer(state, state.player, dt)
  simFallingBlocks(state, dt)
}

function simFallingBlocks (state, dt) {
  for (var i = 0; i < state.fallingBlocks.length; i++) {
    var block = state.fallingBlocks[i]

    // Spin
    block.rotTheta += block.rotVel * dt

    // Move
    var loc = block.location
    var vel = block.velocity
    loc.x += vel.x * dt
    loc.y += vel.y * dt
    loc.z += vel.z * dt

    // Fall, collide w world
    var vel2 = vel.x * vel.x + vel.y * vel.y + vel.z * vel.z

    var negZ = collide(state, loc.x, loc.y, loc.z - 0.51)
    var posZ = collide(state, loc.x, loc.y, loc.z + 0.5)
    var negY = collide(state, loc.x, loc.y - 0.5, loc.z)
    var posY = collide(state, loc.x, loc.y + 0.5, loc.z)
    var negX = collide(state, loc.x - 0.5, loc.y, loc.z)
    var posX = collide(state, loc.x + 0.5, loc.y, loc.z)

    if (!negZ) {
      // Gravity
      vel.z -= config.PHYSICS.GRAVITY * dt
    } else if (vel2 < 1) {
      // Stopped
      loc.x = Math.round(loc.x - 0.5) + 0.5
      loc.y = Math.round(loc.y - 0.5) + 0.5
      loc.z = Math.round(loc.z - 0.5) + 0.5
      vel.x = 0
      vel.y = 0
      vel.z = 0
      block.rotTheta = 0
      block.rotVel = 0
    } else {
      if (negZ) block.rotTheta *= 0.5

      var bounce = 0.6
      var bounceDrag = 0.8
      if (negX) vel.x = Math.abs(vel.x) * bounce
      if (posX) vel.x = -Math.abs(vel.x) * bounce
      if (negY) vel.y = Math.abs(vel.y) * bounce
      if (posY) vel.y = -Math.abs(vel.y) * bounce
      if (negZ) vel.z = Math.abs(vel.z) * bounce
      if (posZ) vel.z = -Math.abs(vel.z) * bounce
      if (negX || posX || negY || posY || negZ || posZ) {
        vel.x *= bounceDrag
        vel.y *= bounceDrag
        vel.z *= bounceDrag
      }
    }
  }
}

function simPlayer (state, player, dt) {
  var loc = player.location
  var vel = player.velocity

  // Horizontal collision
  HORIZONTAL_COLLISION_DIRS.forEach(function (dir) {
    if (!collide(state, loc.x + dir[0], loc.y + dir[1], loc.z + dir[2])) return
    // Back off just enough to avoid collision. Don't bounce.
    if (dir[0] > 0) loc.x = Math.ceil(loc.x) - PW - EPS
    if (dir[0] < 0) loc.x = Math.floor(loc.x) + PW + EPS
    if (dir[1] > 0) loc.y = Math.ceil(loc.y) - PW - EPS
    if (dir[1] < 0) loc.y = Math.floor(loc.y) + PW + EPS
    if (dir[0] !== 0) vel.x = 0
    if (dir[1] !== 0) vel.y = 0
  })

  // Gravity
  vel.z -= config.PHYSICS.GRAVITY * dt

  // Vertical collision
  var underfoot = collide(state, loc.x, loc.y, loc.z - PH - EPS)
  var legs = collide(state, loc.x, loc.y, loc.z - PW - EPS)
  var head = collide(state, loc.x, loc.y, loc.z + PW - EPS)
  if (head && underfoot) {
    vel.z = 0
    player.situation = 'suffocating'
  } else if (head) {
    vel.z = 0
    player.situation = 'airborne'
    loc.z = Math.floor(loc.z - PH - EPS) + PH
  } else if (legs) {
    vel.z = 0
    player.situation = 'on-ground'
    loc.z = Math.ceil(loc.z - PW - EPS) + PH
  } else if (underfoot && vel.z <= 0) {
    vel.z = 0
    player.situation = 'on-ground'
    loc.z = Math.ceil(loc.z - PH - EPS) + PH
  } else {
    player.situation = 'airborne'
  }

  loc.z += vel.z * dt
}

// Returns true if (x, y, z) is unpassable (either in a block or off the world)
function collide (state, x, y, z) {
  var v = state.world.getVox(Math.floor(x), Math.floor(y), Math.floor(z))
  return v > 1
}
