import mat4 from 'gl-mat4'
import env from '../env'
import shaders from '../shaders'
import Poly8 from '../../math/poly8'
import Mesh from '../../math/mesh'
import { Buffer, DrawCommand, DefaultContext } from 'regl'
import MissileObj from '../../protocol/obj/missile-obj'
import vec3 from 'gl-vec3'
import mat3 from 'gl-mat3'

const { regl } = env

const MAX_OBJS = 64
const VERTS_PER_OBJ = 36 // * 2

// One texel: 1/16th of a block
const TX = 1 / 16.0

// Matrices to transform
const mat = mat4.create()
const matN = mat3.create()

// Vertex positions, normals, etc
// const meshMissile = Mesh.combine([
//   Poly8.axisAligned(0, -4 * TX, -4 * TX, 4 * TX, 4 * TX, 4 * TX).createMesh(),
//    Poly8.axisAligned(8 * TX, -3 * TX, -3 * TX, 10 * TX, 3 * TX, 3 * TX).createMesh(),
// ])

const meshMissile = Poly8.axisAligned(-3 * TX, -3 * TX, -3 * TX, 3 * TX, 3 * TX, 3 * TX).createMesh()

const mesh = Mesh.combine(new Array(MAX_OBJS).fill(0).map(x => meshMissile.clone()))
// mesh.uvs = new Array(MAX_OBJS * VERTS_PER_OBJ).fill([0, 0])

// Compiled lazily
let triedCompile = false
let bufVerts: Buffer | undefined
let bufNorms: Buffer | undefined
var drawCommand: DrawCommand<DefaultContext, DrawObjsProps> | undefined

interface DrawObjsProps {
  numVerts: number
}

export default function drawMissiles(objs: MissileObj[]) {
  maybeCompileCommands()
  if (!bufVerts || !bufNorms || !drawCommand) return

  var n = objs.length
  if (n > MAX_OBJS) {
    throw new Error('MAX_OBJS exceeded: ' + n)
  } else if (n === 0) {
    return
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
// var quatRot = quat.create()

function updateMesh(objs: MissileObj[]) {
  var n = objs.length

  for (var i = 0; i < n; i++) {
    var obj = objs[i]
    var loc = obj.location
    var vel = obj.velocity

    mat4.identity(mat)
    mat4.translate(mat, mat, [loc.x, loc.y, loc.z])
    Mesh.transformPart(mesh, meshMissile, mat, matN, i * VERTS_PER_OBJ)

    // Cross product
    vForward[0] = vel.x
    vForward[1] = vel.y
    vForward[2] = vel.z
    vec3.cross(vSide, vPlusZ, vForward)
    vec3.cross(vUp, vSide, vForward)
    // TODO: also rotate
    // mat3.identity(matN)
    // mat3.rotate(matN, matN, block.rotTheta, block.rotAxis)
    // Mesh.transformPart(mesh, meshBlock, mat, matN, i * VERTS_PER_OBJ)
  }
}

function maybeCompileCommands() {
  if (triedCompile) return
  triedCompile = true

  bufVerts = regl.buffer({ usage: 'stream', data: mesh.verts })
  bufNorms = regl.buffer({ usage: 'stream', data: mesh.norms })
  // bufUV = regl.buffer({ usage: 'static', data: mesh.uvs })

  const arrCols = new Array(mesh.verts.length).fill([123.0 / 255.0, 172.0 / 255.0, 186.0 / 255.0, 1])
  const bufCol = regl.buffer({ usage: 'static', data: arrCols })

  drawCommand = regl({
    vert: shaders.vert.colorWorld,
    frag: shaders.frag.color,
    attributes: {
      aPosition: bufVerts,
      aNormal: bufNorms,
      aColor: bufCol,
    },
    uniforms: {
      // uTexture: textures.loaded.atlas,
    },
    count: function(context: DefaultContext, props: DrawObjsProps) {
      return props.numVerts
    },
  })
}
