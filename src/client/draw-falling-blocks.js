var regl = require('./env').regl
var shaders = require('./shaders')
var Poly8 = require('./geometry/poly8')
var Mesh = require('./geometry/mesh')
var mat4 = {
  create: require('gl-mat4/create'),
  identity: require('gl-mat4/identity'),
  translate: require('gl-mat4/translate'),
  rotate: require('gl-mat4/rotate')
}
var mat3 = {
  create: require('gl-mat3/create'),
  identity: require('gl-mat3/identity')
}

module.exports = drawFallingBlocks

var MAX_BLOCKS = 128
var VERTS_PER_BLOCK = 36

// Matrices to transform
var mat = mat4.create()
var matN = mat3.create()

// Vertex positions, normals, etc for each block
var meshBlock = axisAligned(-0.5, -0.5, -0.5, 1, 1, 1, 0, 0)
var mesh = Mesh.combine(new Array(MAX_BLOCKS).fill(0).map(x => meshBlock.clone()))
// var arrPoints = new Float32Array(MAX_BLOCKS * POINTS_PER_BLOCK * 3);

var bufVerts, bufNorms
// var bufUV
var drawCommand

function drawFallingBlocks (blocks) {
  if (!compileCommands()) return

  var n = blocks.length
  if (n > MAX_BLOCKS) {
    throw new Error('MAX_BLOCKS exceeded: ' + n)
  }
  for (var i = 0; i < n; i++) {
    var block = blocks[i]
    var loc = block.location

    mat4.identity(mat)
    mat4.translate(mat, mat, [loc.x, loc.y, loc.z])
    mat4.rotate(mat, mat, block.rotTheta, block.rotAxis)
    Mesh.transformPart(mesh, meshBlock, mat, matN, i * VERTS_PER_BLOCK)
  }

  bufVerts(mesh.verts)
  bufNorms(mesh.norms)

  var props = { numVerts: n * VERTS_PER_BLOCK }
  drawCommand(props)
}

function compileCommands () {
  if (drawCommand) return true
  // if (!textures.loaded.atlas) return false

  bufVerts = regl.buffer({usage: 'stream', data: mesh.verts})
  bufNorms = regl.buffer({usage: 'stream', data: mesh.norms})
  // bufUV = regl.buffer({usage: 'stream', data: arrUV})

  drawCommand = regl({
    vert: shaders.vert.fallingBlocks,
    frag: shaders.frag.color, // DBG todo
    attributes: {
      aPosition: bufVerts,
      aNormal: bufNorms
    },
    uniforms: {
      // uTexture: textures.loaded.atlas
    },
    count: function (context, props) {
      return props.numVerts
    }
  })
  return true
}

// Add a cuboid by x, y, z, width, depth, and height, and integer UV
// Follows the Minecraft texture layout. See
// http://papercraft.robhack.com/various_finds/Mine/texture_templates/mob/spider.png
function axisAligned (x, y, z, w, d, h, u, v) {
  var uvs = getUVs(x, y, z, w, d, h, u, v, 64, 64)
  return Poly8.axisAligned(x, y, z, x + w, y + d, z + h, uvs).createMesh()
}

function getUVs (x, y, z, w, d, h, u, v, tw, th) {
  function makeUV (iu, iv, iw, ih, rot) {
    var u0 = iu / tw
    var v0 = iv / th
    var u1 = (iu + iw) / tw
    var v1 = (iv + ih) / th
    if (rot) return [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]
    else return [[u0, v0], [u0, v1], [u1, v0], [u1, v1]]
  }
  return [
    makeUV(u + 2 * w + 2 * d, v + w + h, -d, -h), // x0 face: back
    makeUV(u + w, v + w + h, d, -h), // x1 face: front
    makeUV(u, v + w + h, w, -h), // y0 face: right
    makeUV(u + 2 * w + d, v + w + h, -w, -h), // y1 face: left
    makeUV(u + w + d, v, d, w, true), // z0 face: bottom
    makeUV(u + w, v, d, w, true) // z1 face: top
  ]
}