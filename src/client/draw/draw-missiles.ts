import mat4 from 'gl-mat4'
import mat3 from 'gl-mat3'
import env from '../env'
import shaders from '../shaders'
import textures from '../textures'
import Poly8 from '../../math/poly8'
import Mesh from '../../math/mesh'
import { VecXYZ } from '../../types'
import { Buffer, DrawCommand, DefaultContext, Vec3 } from 'regl'
import MissileObj from '../../protocol/obj/missile-obj'
import vec3 from 'gl-vec3'
import quat from 'gl-quat'

const { regl } = env

const MAX_OBJS = 64
const VERTS_PER_OBJ = 36 * 2

// One texel: 1/16th of a block
const TX = 1 / 16.0

// Matrices to transform
const mat = mat4.create()
const matN = mat3.create()

// Vertex positions, normals, etc for each block
const meshMissile = Mesh.combine([
  Poly8.axisAligned(0, -4 * TX, -4 * TX, 8 * TX, 4 * TX, 4 * TX).createMesh(),
  Poly8.axisAligned(8 * TX, -3 * TX, -3 * TX, 10 * TX, 3 * TX, 3 * TX).createMesh(),
])

const mesh = Mesh.combine(new Array(MAX_OBJS).fill(0).map(x => meshMissile.clone()))
mesh.uvs = new Array(MAX_OBJS * VERTS_PER_OBJ).fill([0, 0])
const blockTypes = new Uint8Array(MAX_OBJS)

// Compiled lazily
let triedCompile = false
let bufVerts: Buffer | undefined
let bufNorms: Buffer | undefined
let bufUV: Buffer | undefined
var drawCommand: DrawCommand<DefaultContext, DrawFallingBlocksProps> | undefined

export interface DrawFallingBlocksProps {
  numVerts: number
}

export interface Block {
  location: VecXYZ
  rotTheta: number
  rotAxis: Vec3
  typeIndex: number
}

/**
 * Draws up to MAX_BLOCKS falling blocks efficiently.
 */
export default function drawFallingBlocks(objs: MissileObj[]) {
  maybeCompileCommands()
  if (!bufVerts || !bufNorms || !bufUV || !drawCommand) return

  var n = objs.length
  if (n > MAX_OBJS) {
    throw new Error('MAX_OBJS exceeded: ' + n)
  }

  updateMesh(objs)
  bufVerts.subdata(mesh.verts)
  bufNorms.subdata(mesh.norms)

  var props = { numVerts: n * VERTS_PER_OBJ }
  drawCommand(props)
}

const vPlusZ = vec3.fromValues(0, 0, 1)
const vUp = vec3.create()
const vSide = vec3.create()
const vForward = vec3.create()
var quatRot = quat.create()

/**
 * Updates the mesh: moves, rotates the blocks, applies textures.
 *
 * Returns true if we need to update UVs. Verts and norms always need to be updated.
 */
function updateMesh(objs: MissileObj[]) {
  var n = objs.length

  for (var i = 0; i < n; i++) {
    var obj = objs[i]
    var loc = obj.location
    var vel = obj.velocity

    // Cross product
    vForward[0] = vel.x
    vForward[1] = vel.y
    vForward[2] = vel.z
    vec3.cross(vSide, vPlusZ, vForward)
    vec3.cross(vUp, vSide, vForward)
    mat4.identity(mat)
    mat4.translate(mat, mat, [loc.x, loc.y, loc.z])

    // TODO: also rotate
    // mat3.identity(matN)
    // mat3.rotate(matN, matN, block.rotTheta, block.rotAxis)
    // Mesh.transformPart(mesh, meshBlock, mat, matN, i * VERTS_PER_OBJ)
  }
}

function maybeCompileCommands() {
  if (triedCompile) return
  if (!textures.loaded.atlas) return
  triedCompile = true

  bufVerts = regl.buffer({ usage: 'stream', data: mesh.verts })
  bufNorms = regl.buffer({ usage: 'stream', data: mesh.norms })
  bufUV = regl.buffer({ usage: 'static', data: mesh.uvs })

  drawCommand = regl({
    vert: shaders.vert.fallingBlocks,
    frag: shaders.frag.textureLight,
    attributes: {
      aPosition: bufVerts,
      aNormal: bufNorms,
    },
    uniforms: {
      uTexture: textures.loaded.atlas,
    },
    count: function(context: DefaultContext, props: DrawFallingBlocksProps) {
      return props.numVerts
    },
  })
}
