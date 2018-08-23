import env from '../env'
import shaders from '../shaders'
import textures from '../textures'
import Poly8 from '../../math/geometry/poly8'
import camera from '../camera'

// Draws a Heads-Up Display
module.exports = draw

var mesh = Poly8.axisAligned(-1, -1, -1, 1, 1, 1).createMesh()

/**
 * Draws the skybox.
 */
function draw (cameraLoc) {
  drawSkybox({cameraLoc: cameraLoc})
}

var drawSkybox = env.regl({
  vert: shaders.vert.sky,
  frag: shaders.frag.color,
  attributes: {
    aPosition: mesh.verts
  },
  uniforms: {
    uCameraLoc: function (context, props) {
      return props.cameraLoc
    }
  },
  depth: {
    enable: false
  },
  blend: {
    enable: false
  },
  count: mesh.verts.length,
  primitive: 'triangles'
})
