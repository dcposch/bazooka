var mat4 = {
  create: require('gl-mat4/create'),
  identity: require('gl-mat4/identity'),
  translate: require('gl-mat4/translate'),
  rotate: require('gl-mat4/rotate')
}
var mat3 = {
  create: require('gl-mat3/create'),
  identity: require('gl-mat3/identity'),
  rotate: require('gl-mat3/rotate')
}

var regl = require('../env').regl
var shaders = require('../shaders')
var textures = require('../textures')
var Poly8 = require('../../math/geometry/poly8')
var Mesh = require('../../math/geometry/mesh')
var vox = require('../../vox')

module.exports = drawFallingBlocks

var MAX_BLOCKS = 128
var VERTS_PER_BLOCK = 36
var VOX_TEX_TILE_SIZE = 1 / 32.0

// Matrices to transform
var mat = mat4.create()
var matN = mat3.create()

// Vertex positions, normals, etc for each block
var meshBlock = Poly8.axisAligned(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5).createMesh()
var mesh = Mesh.combine(new Array(MAX_BLOCKS).fill(0).map(x => meshBlock.clone()))
mesh.uvs = new Float32Array(MAX_BLOCKS * VERTS_PER_BLOCK * 2)
var blockTypes = new Uint8Array(MAX_BLOCKS)

// Compiled lazily
var triedCompile = false
var bufVerts, bufNorms, bufUV
var drawCommand

/**
 * Draws up to MAX_BLOCKS falling blocks efficiently.
 *
 * Each one should be a block object: { location, velocity, rotAxis, rotTheta, ... }
 */
function drawFallingBlocks (blocks) {
  if (!compileCommands()) return

  var n = blocks.length
  if (n > MAX_BLOCKS) {
    throw new Error('MAX_BLOCKS exceeded: ' + n)
  }
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
      var uvEachSideOfBlock = [uv.top, uv.side, uv.side, uv.side, uv.side, uv.bottom]
      uvEachSideOfBlock.map(function (u, j) {
        var sideIx = i * 72 + j * 12
        // 000 001 010 010 011 001
        mesh.uvs[sideIx + 0] = (u[0] + 0) * VOX_TEX_TILE_SIZE
        mesh.uvs[sideIx + 1] = (u[1] + 0) * VOX_TEX_TILE_SIZE

        mesh.uvs[sideIx + 2] = (u[0] + 0) * VOX_TEX_TILE_SIZE
        mesh.uvs[sideIx + 3] = (u[1] + 1) * VOX_TEX_TILE_SIZE

        mesh.uvs[sideIx + 4] = (u[0] + 1) * VOX_TEX_TILE_SIZE
        mesh.uvs[sideIx + 5] = (u[1] + 0) * VOX_TEX_TILE_SIZE

        mesh.uvs[sideIx + 6] = (u[0] + 1) * VOX_TEX_TILE_SIZE
        mesh.uvs[sideIx + 7] = (u[1] + 0) * VOX_TEX_TILE_SIZE

        mesh.uvs[sideIx + 8] = (u[0] + 1) * VOX_TEX_TILE_SIZE
        mesh.uvs[sideIx + 9] = (u[1] + 1) * VOX_TEX_TILE_SIZE

        mesh.uvs[sideIx + 10] = (u[0] + 0) * VOX_TEX_TILE_SIZE
        mesh.uvs[sideIx + 11] = (u[1] + 1) * VOX_TEX_TILE_SIZE
      })
    }
  }

  bufVerts(mesh.verts)
  bufNorms(mesh.norms)
  if (dirtyUVs) {
    bufUV(mesh.uvs)
    console.log('NEW UVs', mesh.uvs)
  }

  var props = { numVerts: n * VERTS_PER_BLOCK }
  drawCommand(props)
}

function compileCommands () {
  if (triedCompile) return drawCommand
  if (!textures.loaded.atlas) return false

  bufVerts = regl.buffer({usage: 'stream', data: mesh.verts})
  bufNorms = regl.buffer({usage: 'stream', data: mesh.norms})
  bufUV = regl.buffer({usage: 'static', data: mesh.uvs})

  drawCommand = regl({
    vert: shaders.vert.fallingBlocks,
    frag: shaders.frag.textureLight,
    attributes: {
      aPosition: bufVerts,
      aNormal: bufNorms
    },
    uniforms: {
      uTexture: textures.loaded.atlas
    },
    count: function (context, props) {
      return props.numVerts
    }
  })
  return true
}
