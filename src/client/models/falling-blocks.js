var regl = require('../env').regl
var shaders = require('../shaders')
var textures = require('../textures')
var Poly8 = require('../geometry/poly8')
var Mesh = require('../geometry/mesh')
var coordinates = require('../geometry/coordinates')
var config = require('../../config')
var mat4 = {
  create: require('gl-mat4/create'),
  identity: require('gl-mat4/identity'),
  translate: require('gl-mat4/translate'),
  rotateX: require('gl-mat4/rotateX'),
  rotateY: require('gl-mat4/rotateY'),
  rotateZ: require('gl-mat4/rotateZ'),
  scale: require('gl-mat4/scale')
}
var mat3 = {
  create: require('gl-mat3/create')
}

module.exports = drawFallingBlocks

var MAX_BLOCKS = 128
var VERTS_PER_BLOCK = 12

// Matrices to transform 
var mat = mat4.create()
var matN = mat3.create()

// Vertex positions, normals, etc for each block
var meshBlock = axisAligned(0, 0, 0, 1, 1, 1, 0, 0)
var mesh = Mesh.combine(new Array(MAX_BLOCKS).fill(0).map(x => meshBlock.clone()))

window.mesh = mesh
window.meshBlock = meshBlock

var bufVerts, bufNorms
// var bufUV
var drawCommand

function drawFallingBlocks (blocks) {
  if (!compileCommands()) return

  var n = blocks.length
  if (n > MAX_BLOCKS) {
    throw new Error("MAX_BLOCKS exceeded: " + n)
  }
  for (var i = 0; i < n; i++) {
    var loc = blocks[i].location
    mat4.identity(mat)
    mat4.identity(matN)
    mat4.translate(mat, mat, [loc.x, loc.y, loc.z])
    // mat4.rotateZ(mat, mat, azimuth)
    // mat4.rotateY(mat, mat, -altitude)
    // mat4.scale(mat, mat, [SCALE, SCALE, SCALE])
    Mesh.transformPart(mesh, meshBlock, mat, matN, i * VERTS_PER_BLOCK)
  }

  console.log("WTF: " + JSON.stringify(mesh.verts[0]))
  bufVerts.subdata(mesh.verts)
  bufNorms.subdata(mesh.norms)

  // console.log('DRAWING ' + n)
  var props = { count: n }
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
      return props.count
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
