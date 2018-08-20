var config = require('../config')

module.exports = {
  simulate: simulate
}

var HORIZONTAL_COLLISION_DIRS = [
    [PW, 0, 0], [PW, 0, -1],
    [-PW, 0, 0], [-PW, 0, -1],
    [0, PW, 0], [0, PW, -1],
    [0, -PW, 0], [0, -PW, -1]
  ]
var EPS = 0.001
var PW = config.PLAYER_WIDTH
var PH = config.PLAYER_HEIGHT

/**
 * Runs a single step of the physics simulation.
 * 
 * Moves objects, checks for collisions, updates their velocities and states.
 */
function simulate (state, dt) {
  simPlayer(state, dt)
  simFallingBlocks(state.fallingBlocks, dt)
}

function simFallingBlocks (blocks, dt) {
  for (var i = 0 ; i < blocks.length; i++) {
      blocks[i].rotTheta += blocks[i].rotVel * dt
  }
}

function simPlayer (state, dt) {
  var player = state.player
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