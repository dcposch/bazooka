import env from '../env'
import shaders from '../shaders'
import textures from '../textures'
import Poly8 from '../../math/geometry/poly8'
import camera from '../camera'
import { Vec3, DefaultContext } from 'regl'

var mesh = Poly8.axisAligned(-1, -1, -1, 1, 1, 1).createMesh()

export interface SkyProps {
  cameraLoc: Vec3
}

/**
 * Draws the skybox.
 */
export default function draw(cameraLoc: Vec3) {
  drawSkybox({ cameraLoc: cameraLoc })
}

var drawSkybox = env.regl({
  vert: shaders.vert.sky,
  frag: shaders.frag.color,
  attributes: {
    aPosition: mesh.verts,
  },
  uniforms: {
    uCameraLoc: function(context: DefaultContext, props: SkyProps) {
      return props.cameraLoc
    },
  },
  depth: {
    enable: false,
  },
  blend: {
    enable: false,
  },
  count: mesh.verts.length,
  primitive: 'triangles',
})
