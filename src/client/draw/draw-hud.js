var env = require('../env')
var shaders = require('../shaders')
var textures = require('../textures')

var HUD_WIDTH_PX = 128 * 3
var HUD_HEIGHT_PX = 32 * 3
var HUD_BOTTOM_PX = 16
var HUD_LEFT_PX = 16

// Draws a Heads-Up Display
module.exports = draw

var OFFSETS = {
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
  drawQuickbar({mode: props.mode})
}

var drawQuickbar = env.regl({
  vert: shaders.vert.uvClip,
  frag: shaders.frag.texture,
  attributes: {
    aPosition: function (context, props) {
      // Just a single rectangle
      var b = calculateBounds(context, props)
      var verts = makeQuad(b.x0, b.y0, b.x1, b.y1)
      return verts
    },
    aUV: function (context, props) {
      var voff = OFFSETS[props.mode]
      if (voff == null) {
        throw new Error('Unsupported mode: ' + props.mode)
      }

      var u0 = 0
      var v0 = voff / 128
      var u1 = 1
      var v1 = v0 + HUD_HEIGHT_PX / HUD_WIDTH_PX
      return makeQuad(u0, v0, u1, v1)
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
  count: 6,
  primitive: 'triangles'
})

function calculateBounds (context, props) {
  // Single px, x and y, in clip coordinates (which go from bottom left (-1, -1) to top right (1, 1))
  var pxW = 2 / context.viewportWidth
  var pxH = 2 / context.viewportHeight

  var x0 = -1 + pxW * HUD_LEFT_PX
  var x1 = x0 + pxW * HUD_WIDTH_PX
  var y0 = -1 + pxH * (HUD_BOTTOM_PX + HUD_HEIGHT_PX)
  var y1 = y0 - pxH * HUD_HEIGHT_PX

  return {x0: x0, x1: x1, y0: y0, y1: y1}
}

function makeQuad (x0, y0, x1, y1) {
  return [[x0, y0], [x0, y1], [x1, y1], [x0, y0], [x1, y1], [x1, y0]]
}
