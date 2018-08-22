var env = require('../env')
var shaders = require('../shaders')
var textures = require('../textures')

// Draws a Heads-Up Display
module.exports = draw

var STATUS_WIDTH_PX = 66 * 2
var STATUS_HEIGHT_PX = 32 * 2
var HEALTH_WIDTH_PX = 60 * 2
var HEALTH_HEIGHT_PX = 5 * 2
var NUM_LEFT_WIDTH_PX = 60 * 2
var NUM_LEFT_HEIGHT_PX = 16 * 2

var STATUS_OFFSETS = {
  commando: 4,
  bazooka: 32
}

/**
 * Draws the Heads-Up Display.
 *
 * Shows:
 * - Which mode you're in ("bazooka" / "commando" / ...)
 * - TODO: how many players are left alive
 * - TODO: your health bar
 */
function draw (props) {
  drawHud({
    mode: props.mode,
    health: props.health,
    numPlayersLeft: props.numPlayersLeft 
  })
}

var drawHud = env.regl({
  vert: shaders.vert.uvClip,
  frag: shaders.frag.texture,
  attributes: {
    aPosition: function (context, props) {
      var rects = []

      // Single px, x and y, in clip coordinates (which go from bottom left (-1, -1) to top right (1, 1))
      var pxW = 2 / context.viewportWidth
      var pxH = 2 / context.viewportHeight

      // Rect 1: left status
      rects.push(makeQuad(
        -1 + pxW * 16, 
        -1 + pxH * (16 + STATUS_HEIGHT_PX),
        -1 + pxW * (16 + STATUS_WIDTH_PX), 
        -1 * pxH * 16))

      // Rect 2: health bar
      var healthX = pxW * (HEALTH_WIDTH_PX * -0.5 + props.health)
      rects.push(makeQuad(
        pxW * HEALTH_WIDTH_PX * -0.5, 
        -1 + pxH * (24 + HEALTH_HEIGHT_PX),
        healthX, 
        -1 * pxH * 24))
      
      // Rect 3: health bar consumed
      rects.push(makeQuad(
        healthX, 
        -1 + pxH * (24 + HEALTH_HEIGHT_PX),
        pxW * HEALTH_WIDTH_PX * 0.5, 
        -1 * pxH * 24))
      
      // Rect 4: num players left alive
      rects.push(makeQuad(
        1 - pxW * (16 + NUM_LEFT_WIDTH_PX), 
        -1 + pxH * (16 + NUM_LEFT_HEIGHT_PX),
        1 - pxW * 16, 
        -1 * pxH * 16))

      // TODO nums

      return rects
    },

    aUV: function (context, props) {
      var rects = []

      // Each texel is 1/128 UV coords
      var tx = 2 / 128

      // Rect 1
      var voff = STATUS_OFFSETS[props.mode]
      if (voff == null) {
        throw new Error('Unsupported mode: ' + props.mode)
      }
      rects.push(makeQuad(-1 * tx * 4, voff * tx, -1 * tx * 70, voff * tx + STATUS_HEIGHT_PX / STATUS_WIDTH_PX * 0.5))

      // Rect 2: health bar
      var healthU = -1 + tx * (4 + props.health)
      rects.push(makeQuad(-1 + tx * 4, 1 - tx * 49, healthU, 1 - tx * 54))

      // Rect 3: health bar consumed
      rects.push(makeQuad(healthU, 1 - tx * 56, 0, 1 - tx * 61))

      // Rect 4: num players left alive
      rects.push(makeQuad(-1 + tx * 4, 1 - tx * 32, 0, 1 - tx * 48))

      return rects
    }
  },
  uniforms: {
    uTexture: function (context, props) {
      return textures.loaded.hud
    }
  },
  depth: {
    enable: false
  },
  blend: {
    enable: false
  },
  count: 6 * 4,
  primitive: 'triangles'
})

function makeQuad (x0, y0, x1, y1) {
  return [[x0, y0], [x0, y1], [x1, y1], [x0, y0], [x1, y1], [x1, y0]]
}
