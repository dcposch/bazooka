import mat4 from 'gl-mat4'
import mat3 from 'gl-mat3'
import env from '../env'
import shaders from '../shaders'
import textures from '../textures'
import Poly8 from '../../math/geometry/poly8'
import Mesh from '../../math/geometry/mesh'
import vox from '../../vox'
import { VecXYZ } from '../../types'
import { Buffer, DrawCommand, DefaultContext, Vec3 } from 'regl'

const { regl } = env

const MAX_BLOCKS = 128
const VERTS_PER_BLOCK = 36
const VOX_TEX_TILE_SIZE = 1 / 32.0

// Matrices to transform
const mat = mat4.create()
const matN = mat3.create()

// Vertex positions, normals, etc for each block
const meshBlock = Poly8.axisAligned(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5).createMesh()
const mesh = Mesh.combine(new Array(MAX_BLOCKS).fill(0).map(x => meshBlock.clone()))
mesh.uvs = new Array(MAX_BLOCKS * VERTS_PER_BLOCK).fill([0, 0])
const blockTypes = new Uint8Array(MAX_BLOCKS)

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
export default function drawFallingBlocks(blocks: Block[]) {
  maybeCompileCommands()
  if (!bufVerts || !bufNorms || !bufUV || !drawCommand) return

  var n = blocks.length
  if (n > MAX_BLOCKS) {
    throw new Error('MAX_BLOCKS exceeded: ' + n)
  }

  var hasDirtyUVs = updateMesh(blocks)

  bufVerts(mesh.verts)
  bufNorms(mesh.norms)
  if (hasDirtyUVs) {
    bufUV(mesh.uvs)
  }

  var props = { numVerts: n * VERTS_PER_BLOCK }
  drawCommand(props)
}

/**
 * Updates the mesh: moves, rotates the blocks, applies textures.
 *
 * Returns true if we need to update UVs. Verts and norms always need to be updated.
 */
function updateMesh(blocks: Block[]) {
  var n = blocks.length
  var dirtyUVs = false
  for (var i = 0; i < n; i++) {
    var block = blocks[i]
    var loc = block.location
    mat4.identity(mat)
    mat4.translate(mat, mat, [loc.x, loc.y, loc.z])
    mat4.rotate(mat, mat, block.rotTheta, block.rotAxis)
    mat3.identity(matN)
    mat3.rotate(matN, matN, block.rotTheta, block.rotAxis)
    Mesh.transformPart(mesh, meshBlock, mat, matN, i * VERTS_PER_BLOCK)
    if (blockTypes[i] !== block.typeIndex) {
      dirtyUVs = true
      blockTypes[i] = block.typeIndex
      var uv = vox.TYPES[block.typeIndex].uv
      if (uv) {
        var uvEachSideOfBlock = [uv.top, uv.side, uv.side, uv.side, uv.side, uv.bottom]
        uvEachSideOfBlock.map(function(u, j) {
          // 000 001 010 010 011 001
          // TODO:
          var sideIx = i * 36 + j * 6
          mesh.uvs[sideIx + 0] = [(u[0] + 0) * VOX_TEX_TILE_SIZE, (u[1] + 0) * VOX_TEX_TILE_SIZE]
          mesh.uvs[sideIx + 0] = [(u[0] + 0) * VOX_TEX_TILE_SIZE, (u[1] + 1) * VOX_TEX_TILE_SIZE]
          mesh.uvs[sideIx + 0] = [(u[0] + 1) * VOX_TEX_TILE_SIZE, (u[1] + 0) * VOX_TEX_TILE_SIZE]
          mesh.uvs[sideIx + 0] = [(u[0] + 1) * VOX_TEX_TILE_SIZE, (u[1] + 0) * VOX_TEX_TILE_SIZE]
          mesh.uvs[sideIx + 0] = [(u[0] + 1) * VOX_TEX_TILE_SIZE, (u[1] + 1) * VOX_TEX_TILE_SIZE]
          mesh.uvs[sideIx + 0] = [(u[0] + 0) * VOX_TEX_TILE_SIZE, (u[1] + 1) * VOX_TEX_TILE_SIZE]
        })
      }
    }
  }
  return dirtyUVs
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
