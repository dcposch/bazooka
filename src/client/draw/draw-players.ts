import env from '../env'
import shaders from '../shaders'
import textures from '../textures'
import Poly8 from '../../math/poly8'
import Mesh from '../../math/mesh'
import config from '../../config'
import mat4 from 'gl-mat4'
import mat3 from 'gl-mat3'
import vec3 from 'gl-vec3'
import { PlayerMode, Bone } from '../../types'
import { Buffer, DefaultContext, Vec2 } from 'regl'
import PlayerObj from '../../protocol/obj/player-obj'

const { regl } = env

// Matrices to translate, rotate, and scale each model
var mat = mat4.create()
var matN = mat3.create()

// Scale factor from model to world coordinates
var SCALE = config.PLAYER_HEIGHT / 28

// Barrel length and width
var BW = 4
var BL = 12

// Nozzle length and width
var NW = 6
var NL = 6

// Mesh templates. Every individual player mesh is a copy of the template
var meshParts = {
  head: axisAligned(-4, -4, -4, 8, 8, 8, 0, 0),
  body: axisAligned(-2, -4, -16, 4, 8, 12, 16, 16),
  armR: axisAligned(-2, -8, -16, 4, 4, 12, 40, 16),
  armL: axisAligned(-2, 4, -16, 4, 4, 12, 32, 48),
  legR: axisAligned(-2, -4, -28, 4, 4, 12, 0, 16),
  legL: axisAligned(-2, 0, -28, 4, 4, 12, 16, 48),
  bazooka: makeBazookaMesh(-2, -6, 0),
}

var meshTemplate = makeMesh()

// Vertex positions and normals vary from player to player, but UVs are shared
var bufferUVs = regl.buffer(meshTemplate.uvs)

class PlayerModel {
  bones: {
    head: Bone
    armL: Bone
    armR: Bone
    legL: Bone
    legR: Bone
    bazooka: Bone
  }
  mesh: Mesh
  buffers: {
    verts: Buffer
    norms: Buffer
  }

  constructor() {
    this.bones = {
      head: { rot: vec3.fromValues(0, 0, 0), center: vec3.fromValues(0, 0, 0) },
      armL: { rot: vec3.fromValues(0, 0, 0), center: vec3.fromValues(0, 4, -4) },
      armR: { rot: vec3.fromValues(0, 0, 0), center: vec3.fromValues(0, -4, -4) },
      legL: { rot: vec3.fromValues(0, 0, 0), center: vec3.fromValues(0, 2, -16) },
      legR: { rot: vec3.fromValues(0, 0, 0), center: vec3.fromValues(0, -2, -16) },
      bazooka: { rot: vec3.fromValues(0, 0, 0), center: vec3.fromValues(0, -4, -4) },
    }

    this.mesh = meshTemplate.clone()

    // Allocate buffers once, update the contents each frame
    // Usage stream lets WebGL know we'll be updating the buffers often.
    this.buffers = {
      verts: regl.buffer({ usage: 'stream', data: this.mesh.verts }),
      norms: regl.buffer({ usage: 'stream', data: this.mesh.norms }),
    }
  }

  draw(pl: PlayerObj) {
    var legAngle = Math.sin(pl.walk)
    this.bones.legL.rot[1] = -legAngle
    this.bones.legR.rot[1] = legAngle
    this.bones.legL.center[0] = legAngle > 0 ? -2 : 2
    this.bones.legR.center[0] = legAngle < 0 ? -2 : 2
    this.bones.armL.rot[1] = Math.sin(pl.walk)
    this.bones.armR.rot[1] = -Math.sin(pl.walk)

    // Aim
    var rotAimUpDown = -0.2 - pl.direction.altitude
    if (pl.mode === 'bazooka') {
      this.bones.armR.rot[1] = -1.5 + rotAimUpDown
      this.bones.bazooka.rot[1] = rotAimUpDown
    }

    // Look
    var rotLookUpDown = Math.min(1, Math.max(-1, -pl.direction.altitude))
    this.bones.head.rot[1] = rotLookUpDown

    var loc = pl.location
    var azimuth = pl.direction.azimuth
    var altitude = 0 // Player head moves, body stays level

    // Update the mesh
    // TODO: do this in a vert shader using ANGLE_instanced_array?
    Mesh.copyPart(this.mesh, meshParts.body)
    moveBone(this.mesh, meshParts.head, this.bones.head)
    moveBone(this.mesh, meshParts.armL, this.bones.armL)
    moveBone(this.mesh, meshParts.armR, this.bones.armR)
    moveBone(this.mesh, meshParts.legL, this.bones.legL)
    moveBone(this.mesh, meshParts.legR, this.bones.legR)
    moveBone(this.mesh, meshParts.bazooka, this.bones.bazooka)

    mat4.identity(mat)
    mat4.translate(mat, mat, [loc.x, loc.y, loc.z])
    mat4.rotateZ(mat, mat, azimuth)
    mat4.rotateY(mat, mat, -altitude)
    mat4.scale(mat, mat, [SCALE, SCALE, SCALE])
    Mesh.transform(this.mesh, this.mesh, mat, matN)

    // Update buffers
    this.buffers.verts.subdata(this.mesh.verts)
    this.buffers.norms.subdata(this.mesh.norms)

    drawCommand({ model: this, obj: pl })
  }

  destroy() {
    this.buffers.verts.destroy()
    this.buffers.norms.destroy()
  }
}

interface DrawPlayerProps {
  model: PlayerModel
  obj: PlayerObj
}

var drawCommand = regl<{}, {}, DrawPlayerProps>({
  frag: shaders.frag.texture,
  vert: shaders.vert.uvWorld,
  attributes: {
    aPosition: function(context: DefaultContext, props: DrawPlayerProps) {
      return props.model.buffers.verts
    },
    aNormal: function(context: DefaultContext, props: DrawPlayerProps) {
      return props.model.buffers.norms
    },
    aUV: bufferUVs,
  },
  uniforms: {
    uTexture: function(context: DefaultContext, props: DrawPlayerProps) {
      var mode = props.obj.mode
      if (mode === PlayerMode.COMMANDO) return textures.loaded.skinCommando
      else if (mode === PlayerMode.BAZOOKA) return textures.loaded.skinArmy
      else throw new Error('Unsupported mode ' + mode)
    },
  },
  count: meshTemplate.verts.length,
})

function moveBone(mesh: Mesh, part: Mesh, bone: Bone) {
  var c = bone.center
  mat4.identity(mat)
  mat4.translate(mat, mat, c)
  mat4.rotateX(mat, mat, bone.rot[0])
  mat4.rotateY(mat, mat, bone.rot[1])
  mat4.rotateZ(mat, mat, bone.rot[2])
  mat4.translate(mat, mat, [-c[0], -c[1], -c[2]])
  Mesh.transformPart(mesh, part, mat, matN, part.offset)
}

function makeMesh() {
  var meshes = [
    meshParts.head,
    meshParts.body,
    meshParts.armL,
    meshParts.armR,
    meshParts.legL,
    meshParts.legR,
    meshParts.bazooka,
  ]
  return Mesh.combine(meshes)
}

// Add a cuboid by x, y, z, width, depth, and height, and integer UV
// Follows the Minecraft texture layout. See
// http://papercraft.robhack.com/various_finds/Mine/texture_templates/mob/spider.png
function axisAligned(x: number, y: number, z: number, w: number, d: number, h: number, u: number, v: number) {
  var uvs = getUVs(x, y, z, w, d, h, u, v, 64, 64)
  return Poly8.axisAligned(x, y, z, x + w, y + d, z + h, uvs).createMesh()
}

function getUVs(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  u: number,
  v: number,
  tw: number,
  th: number
) {
  return ([] as Vec2[]).concat(
    rectUVs(u + 2 * w + 2 * d, v + w + h, -d, -h, tw, th), // x0 face: back
    rectUVs(u + w, v + w + h, d, -h, tw, th), // x1 face: front
    rectUVs(u, v + w + h, w, -h, tw, th), // y0 face: right
    rectUVs(u + 2 * w + d, v + w + h, -w, -h, tw, th), // y1 face: left
    rectUVs(u + w + d, v, d, w, tw, th, true), // z0 face: bottom
    rectUVs(u + w, v, d, w, tw, th, true) // z1 face: top
  )
}

function makeBazookaMesh(x: number, y: number, z: number) {
  // Straight ahead with {azimuth : 0} points toward +X
  var uvsBarrel = cubeUVs(52, 32, BL, BW, BW, 64, 64)
  var uvsNozzle = cubeUVs(52, 32, NL, NW, NW, 64, 64)
  var barrel = Poly8.axisAligned(x, y - BW / 2, z - BW / 2, x + BL, y + BW / 2, z + BW / 2, uvsBarrel)
  var nozzle = Poly8.axisAligned(x + BL, y - NW / 2, z - NW / 2, x + BL + NL, y + NW / 2, z + NW / 2, uvsNozzle)
  return Mesh.combine([barrel.createMesh(), nozzle.createMesh()])
}

// Takes (u v width height) in texels, texture size (tw th) in texels
// Returns texture coords for a rectangle: [[u,v] * 4]
function rectUVs(iu: number, iv: number, iw: number, ih: number, tw: number, th: number, flip?: boolean): Vec2[] {
  if (!tw || !tw) throw new Error('missing tex dims')
  var u0 = iu / tw
  var v0 = iv / th
  var u1 = (iu + iw) / tw
  var v1 = (iv + ih) / th
  if (flip) return [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]
  else return [[u0, v0], [u0, v1], [u1, v0], [u1, v1]]
}

// Gets texture coordinates (UVs) for a cuboid with a uniform texture
// (eg wood grain or checkered, not for eg. a six-sided dice where UV offsets matter)
function cubeUVs(iu: number, iv: number, width: number, depth: number, height: number, tw: number, th: number) {
  if (!tw || !tw) throw new Error('missing tex dims')

  // scale factor from world to texture coordinates
  return ([] as Vec2[]).concat(
    rectUVs(iu, iv, depth, height, tw, th), // x0 face: depth x height
    rectUVs(iu, iv, depth, height, tw, th),
    rectUVs(iu, iv, width, height, tw, th), // y0 face: width x height
    rectUVs(iu, iv, width, height, tw, th),
    rectUVs(iu, iv, width, depth, tw, th, true), // z0 face: width x depth
    rectUVs(iu, iv, width, depth, tw, th, true)
  )
}

// TODO: Is it better to
// A: create one small set of buffers, set data + draw call n times
// B: create n sets of buffers, set data + draw call on each one
// C: create one big set of buffers, set data (for all players) + draw call one time
// Going with option A for now.

const model = new PlayerModel()

export default function drawPlayers(players: PlayerObj[]) {
  for (const pl of players) {
    model.draw(pl)
  }
}
