import mat4 from 'gl-mat4'
import vec3 from 'gl-vec3'
import { toCartesian } from '../math/geometry/coordinates'
import { DefaultContext, Vec3 } from 'regl'
import Player from './models/player'

// Projects the world from 3D to 2D
// Calculates the view and projection matrices based on player location and orientation
// (The model matrix must be multiplied in separately. Voxel chunks are already in world
// coordinates, so they don't need one.)
export default {
  updateMatrix,
  getMatrix,
}

export interface CameraProps {
  player: Player
  cameraLoc: Vec3
}

// View, projection, and combined matrices
// Do all allocations upfront. There should be no dynamic memory allocations during rendering.
var vmat = mat4.create()
var pmat = mat4.create()
var mat = mat4.create()

// Calculates and returns the combined projection and view matrix
function updateMatrix(context: DefaultContext, props: CameraProps) {
  // First, figure out where the camera goes
  var dir = props.player.direction
  var loc = props.player.location
  var vel = props.player.velocity

  var caltitude = Math.min(1, Math.max(-1, dir.altitude)) * 0.7 - 0.1
  var lookDir = toCartesian(dir.azimuth, caltitude, 1.0)

  var cloc = props.cameraLoc
  switch (props.player.camera) {
    case 'first-person':
      // Camera glued to the front of the player's face, facing forward
      cloc[0] = loc.x + 0.3 * lookDir[0]
      cloc[1] = loc.y + 0.3 * lookDir[1]
      cloc[2] = loc.z + 0.3 * lookDir[2]
      break
    case 'third-person':
      // Camera flies to a target location above & behind the player
      // TODO: add a collision check?
      // Currently, the camera can go inside nearby blocks in third-person view.
      var cdir = vec3.clone([lookDir[0] + vel.x * 0.15, lookDir[1] + vel.y * 0.15, lookDir[2]])
      var cnorm = 1 / Math.sqrt(vec3.dot(cdir, cdir))
      vec3.scale(cdir, cdir, cnorm)

      var dist = Math.cos(caltitude) * 5 + 1
      var decay = 0.1
      cloc[0] = (loc.x - dist * cdir[0]) * decay + cloc[0] * (1 - decay)
      cloc[1] = (loc.y - dist * cdir[1]) * decay + cloc[1] * (1 - decay)
      cloc[2] = (loc.z - dist * cdir[2] + 1) * decay + cloc[2] * (1 - decay)
      break
    default:
      throw new Error('unknown camera setting ' + props.player.camera)
  }

  // Then, make the view matrix
  mat4.identity(vmat)
  mat4.rotate(vmat, vmat, dir.altitude, [0, 1, 0])
  mat4.rotate(vmat, vmat, -dir.azimuth, [0, 0, 1])
  mat4.translate(vmat, vmat, [-cloc[0], -cloc[1], -cloc[2]])

  // Then, make the projection matrix
  var width = context.viewportWidth
  var height = context.viewportHeight
  mat4.perspective(pmat, 1, width / height, 0.1, 1000.0)

  // Rotate the coordinates. +Z is up here, id / Carmack style
  // Convert from a normal proj mat where +Y is up
  for (var i = 0; i < 4; i++) {
    var tmp = pmat[8 + i]
    pmat[8 + i] = pmat[4 + i]
    pmat[4 + i] = -pmat[i]
    pmat[i] = -tmp
  }

  // Multiply the projection and view matrices to get the camera matrix
  mat4.multiply(mat, pmat, vmat)

  return mat
}

// Gets the latest view matrix, projection matrix, or combined (multiplied)
function getMatrix(which: string) {
  if (which === 'view') return vmat
  else if (which === 'projection') return pmat
  else if (which === 'combined') return mat
  else throw new Error('unknown matrix ' + which)
}
