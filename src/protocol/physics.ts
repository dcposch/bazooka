import config from '../config'
import { ObjSituation, ObjType, VecXYZ } from '../types'
import FallingBlockObj from './obj/falling-block-obj'
import World from './world'
import MissileObj from './obj/missile-obj'
import GameObj from './obj/game-obj'
import vox from '../protocol/vox'
import vec3 from 'gl-vec3'
import { Vec3 } from 'regl'
import PlayerObj from './obj/player-obj'

var EPS = 0.001
var PW = config.PLAYER_WIDTH
var PH = config.PLAYER_HEIGHT
var HORIZONTAL_COLLISION_DIRS = [
  [PW, 0, 0],
  [PW, 0, -1],
  [-PW, 0, 0],
  [-PW, 0, -1],
  [0, PW, 0],
  [0, PW, -1],
  [0, -PW, 0],
  [0, -PW, -1],
]

/**
 * Simulates forward by `dt` seconds.
 *
 * May modify `world`, placing or breaking blocks.
 *
 * May modify `objects`, only by appending or modifying new objects.
 */
export function simObjects(objects: GameObj[], world: World, nowMs: number) {
  let offset = 0
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i]
    objects[i - offset] = obj
    const dt = (nowMs - obj.lastUpdateMs) * 1e-3
    const firstSim = obj.lastUpdateMs === 0
    obj.lastUpdateMs = nowMs
    if (firstSim) {
      continue
    }
    const shouldDel = simObject(obj, objects, world, dt)
    if (shouldDel) {
      offset++
    }
  }
  if (offset > 0) {
    objects.length -= offset
  }
}

/**
 * Simulates this object forward by `dt` seconds.
 *
 * Returns true iff the `obj` should be deleted from `objects`.
 */
function simObject(obj: GameObj, objects: GameObj[], world: World, dt: number) {
  switch (obj.type) {
    case ObjType.FALLING_BLOCK:
      return simFallingBlock(obj as FallingBlockObj, world, dt)
    case ObjType.MISSILE:
      return simMissile(obj as MissileObj, objects, world, dt)
    case ObjType.PLAYER:
      return simPlayer(obj as PlayerObj, objects, world, dt)
  }
  return false
}

function simMissile(obj: MissileObj, objects: GameObj[], world: World, dt: number) {
  // Move
  var loc = obj.location
  var vel = obj.velocity
  loc.x += vel.x * dt
  loc.y += vel.y * dt
  loc.z += vel.z * dt

  // Fall
  vel.z -= config.PHYSICS.GRAVITY * dt

  // Collide w world
  const exploded = collide(world, loc.x, loc.y, loc.z)
  if (exploded) {
    obj.situation = ObjSituation.IN_GROUND

    // Explode some blocks
    let ix = loc.x | 0
    let iy = loc.y | 0
    let iz = (loc.z - 1) | 0
    const zw = 2
    for (let z = iz - zw; z <= iz + zw; z++) {
      const xw = zw - Math.min(1, iz - z)
      for (let x = ix - xw; x <= ix + xw; x++) {
        const yw = xw - Math.abs(x - ix)
        for (let y = iy - yw; y <= iy + yw; y++) {
          const v = world.getVox(x, y, z)
          if (!vox.isSolid(v)) continue

          // Solid block disappears
          world.setVox(x, y, z, vox.INDEX.AIR)

          // Falling block explodes up from its place
          const fb = new FallingBlockObj('fb_' + x + '_' + y + '_' + z)
          const loc = { x: (x + ix) / 2, y: (y + iy) / 2, z: (z + iz) / 2 }
          fb.location = loc
          const splodiness = 4
          const rng = 1
          fb.velocity = {
            x: (loc.x - ix + rand0(rng)) * splodiness,
            y: (loc.y - iy + rand0(rng)) * splodiness,
            z: (loc.z - iz + 6 + rand0(rng)) * splodiness,
          }
          randomRotAxis(fb.rotAxis)
          fb.rotVel = Math.random() * 4 - 2
          fb.typeIndex = v

          objects.push(fb)
        }
      }
    }
  }

  return exploded
}

/** Returns a random number in (-x, x) */
function rand0(x) {
  return Math.random() * x * 2 - x
}

function randomRotAxis(v: Vec3) {
  v[0] = Math.random()
  v[1] = Math.random()
  v[2] = Math.random()
  var det = Math.sqrt(vec3.dot(v, v))
  v[0] /= det
  v[1] /= det
  v[2] /= det
}

function simFallingBlock(block: FallingBlockObj, world: World, dt: number) {
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

  var negZ = collide(world, loc.x, loc.y, loc.z - 0.51)
  var posZ = collide(world, loc.x, loc.y, loc.z + 0.5)
  var negY = collide(world, loc.x, loc.y - 0.5, loc.z)
  var posY = collide(world, loc.x, loc.y + 0.5, loc.z)
  var negX = collide(world, loc.x - 0.5, loc.y, loc.z)
  var posX = collide(world, loc.x + 0.5, loc.y, loc.z)

  let ret = false
  if (!negZ) {
    // Gravity
    vel.z -= config.PHYSICS.GRAVITY * dt
  } else if (vel2 < 1) {
    // Stopped
    const x = Math.round(loc.x - 0.5)
    const y = Math.round(loc.y - 0.5)
    const z = Math.round(loc.z - 0.5)
    world.setVox(x, y, z, block.typeIndex)
    ret = true
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

  return ret
}

function simPlayer(player: PlayerObj, objects: GameObj[], world: World, dt: number): boolean {
  simPlayerNav(player, dt)
  simPlayerPhysics(player, world, dt)
  simPlayerDamage(player, objects, dt)

  player.bazookaJuice = Math.min(50, player.bazookaJuice + 10 * dt)

  return false
}

function simPlayerDamage(player: PlayerObj, objects: GameObj[], dt: number) {
  if (player.damageHealth < player.health) {
    player.health = Math.max(player.damageHealth, player.health - dt * 10)
    return
  }

  const hb = 2 // hitbox
  const x0 = player.location.x - hb
  const x1 = player.location.x + hb
  const y0 = player.location.y - hb
  const y1 = player.location.y + hb
  const z0 = player.location.z - 1
  const z1 = player.location.z + 1

  let hit = false
  const n = objects.length
  for (let i = 0; i < n; i++) {
    const obj = objects[i]
    if (obj.type === ObjType.PLAYER) continue
    const { x, y, z } = obj.location
    if (x > x0 && x < x1 && y > y0 && y < y1 && z > z0 && z < z1) {
      hit = true
    }
  }

  if (hit) {
    player.damageHealth = Math.max(0, player.health - 10)
  }
}

function simPlayerNav(player: PlayerObj, dt: number) {
  var loc = player.location
  var dir = player.direction
  var vel = player.velocity

  // console.log('WTFBBQ ' + player.key + ' ' + JSON.stringify(player.input))

  // Directional input (WASD) always works
  vel.x = 0
  vel.y = 0
  if (player.input.forward) move(vel, 1, dir.azimuth, 0)
  if (player.input.back) move(vel, 1, dir.azimuth + Math.PI, 0)
  if (player.input.left) move(vel, 1, dir.azimuth + Math.PI * 0.5, 0)
  if (player.input.right) move(vel, 1, dir.azimuth + Math.PI * 1.5, 0)
  var v2 = vel.x * vel.x + vel.y * vel.y
  if (v2 > 0) {
    var speed = player.input.sprint ? config.SPEED_SPRINT : config.SPEED_WALK
    var norm = speed / Math.sqrt(vel.x * vel.x + vel.y * vel.y)
    vel.x *= norm
    vel.y *= norm
  }
  loc.x += vel.x * dt
  loc.y += vel.y * dt

  // Jumping (space) only works if we're on solid ground
  if (player.input.jump && player.situation === 'on-ground') {
    vel.z = player.input.sprint ? config.SPEED_SPRINT_JUMP : config.SPEED_JUMP
    player.situation = ObjSituation.AIRBORNE
  }
}

// Modify vector {x, y, z} by adding a vector in spherical coordinates
function move(v: VecXYZ, r: number, azimuth: number, altitude: number) {
  v.x += Math.cos(azimuth) * Math.cos(altitude) * r
  v.y += Math.sin(azimuth) * Math.cos(altitude) * r
  v.z += Math.sin(altitude) * r
}

function simPlayerPhysics(player: PlayerObj, world: World, dt: number) {
  var loc = player.location
  var vel = player.velocity

  // Horizontal collision
  HORIZONTAL_COLLISION_DIRS.forEach(function(dir) {
    if (!collide(world, loc.x + dir[0], loc.y + dir[1], loc.z + dir[2])) return
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
  var underfoot = collide(world, loc.x, loc.y, loc.z - PH - EPS)
  var legs = collide(world, loc.x, loc.y, loc.z - PW - EPS)
  var head = collide(world, loc.x, loc.y, loc.z + PW - EPS)
  if (head && underfoot) {
    vel.z = 0
    player.situation = ObjSituation.IN_GROUND
  } else if (head) {
    vel.z = 0
    player.situation = ObjSituation.AIRBORNE
    loc.z = Math.floor(loc.z - PH - EPS) + PH
  } else if (legs) {
    vel.z = 0
    player.situation = ObjSituation.ON_GROUND
    loc.z = Math.ceil(loc.z - PW - EPS) + PH
  } else if (underfoot && vel.z <= 0) {
    vel.z = 0
    player.situation = ObjSituation.ON_GROUND
    loc.z = Math.ceil(loc.z - PH - EPS) + PH
  } else {
    player.situation = ObjSituation.AIRBORNE
  }

  loc.z += vel.z * dt
}

// Returns true if (x, y, z) is unpassable (either in a block or off the world)
function collide(world: World, x: number, y: number, z: number) {
  var v = world.getVox(Math.floor(x), Math.floor(y), Math.floor(z))
  return v > 1
}
