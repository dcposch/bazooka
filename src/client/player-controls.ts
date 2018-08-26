import config from '../config'
import env from './env'
import vox from '../protocol/vox'
import { GameState, PlayerMode, CameraMode, VecXYZ, ObjSituation, GameCmdSetVox } from '../types'
import PlayerObj from '../protocol/obj/player-obj'

var shell = env.shell

export default {
  navigate,
  look,
  interact,
}

// Lets the player place and break blocks
// TODO: let the player interact with items
function interact(state: GameState) {
  if (shell.wasDown('1')) {
    state.player.mode = PlayerMode.BAZOOKA
  } else if (shell.wasDown('2')) {
    state.player.mode = PlayerMode.COMMANDO
  } else if (shell.wasDown('3')) {
    //dbgSpawnBlocks(state)
  } else if (shell.wasDown('F')) {
    state.pendingCommands.push({ type: 'fire-bazooka' })
  }

  if (shell.press('9')) {
    state.cameraMode = state.cameraMode === CameraMode.FIRST_PERSON ? CameraMode.THIRD_PERSON : CameraMode.FIRST_PERSON
  }

  if (shell.press('0')) state.debug.showHUD = !state.debug.showHUD

  var left = shell.wasDown('mouse-left')
  if (left) return breakBlock(state)

  return undefined
}

// Let the player move
function navigate(player: PlayerObj, dt: number) {
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
  var v2 = vel.x * vel.x + vel.y * vel.y
  if (v2 > 0) {
    var speed = shell.wasDown('nav-sprint') ? config.SPEED_SPRINT : config.SPEED_WALK
    var norm = speed / Math.sqrt(vel.x * vel.x + vel.y * vel.y)
    vel.x *= norm
    vel.y *= norm
  }
  loc.x += vel.x * dt
  loc.y += vel.y * dt

  // Jumping (space) only works if we're on solid ground
  if (shell.wasDown('nav-jump') && player.situation === 'on-ground') {
    vel.z = shell.wasDown('nav-sprint') ? config.SPEED_SPRINT_JUMP : config.SPEED_JUMP
    player.situation = ObjSituation.AIRBORNE
  }
}

// Modify vector {x, y, z} by adding a vector in spherical coordinates
function move(v: VecXYZ, r: number, azimuth: number, altitude: number) {
  v.x += Math.cos(azimuth) * Math.cos(altitude) * r
  v.y += Math.sin(azimuth) * Math.cos(altitude) * r
  v.z += Math.sin(altitude) * r
}

// Let the player look around
function look(player: PlayerObj) {
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
// function placeBlock(state: GameState) {
//   var block = state.player.lookAtBlock
//   if (!block) return
//   var loc = block.location
//   var side = block.side
//   var bx = loc.x + side.x
//   var by = loc.y + side.y
//   var bz = loc.z + side.z

//   // Don't let the player place a block where they're standing
//   var p = state.player.location
//   var intersectsPlayer = bx === Math.floor(p.x) && by === Math.floor(p.y) && [0, -1].includes(bz - Math.floor(p.z))
//   if (intersectsPlayer) return

//   return setBlock(state, bx, by, bz, state.player.placing)
// }

// Break the block we're looking at
function breakBlock(state: GameState) {
  var block = state.lookAtBlock
  if (!block) return

  var loc = block.location
  var neighbors = [
    state.world.getVox(loc.x + 1, loc.y, loc.z),
    state.world.getVox(loc.x, loc.y + 1, loc.z),
    state.world.getVox(loc.x - 1, loc.y, loc.z),
    state.world.getVox(loc.x, loc.y - 1, loc.z),
    state.world.getVox(loc.x, loc.y, loc.z + 1),
  ]
  var v = neighbors.includes(vox.INDEX.WATER) ? vox.INDEX.WATER : vox.INDEX.AIR

  return setBlock(state, loc.x, loc.y, loc.z, v)
}

function setBlock(state: GameState, x: number, y: number, z: number, v: number): GameCmdSetVox {
  // TODO: move prediction to its own file
  state.world.setVox(x, y, z, v)
  return { type: 'set', x: x, y: y, z: z, v: v }
}
