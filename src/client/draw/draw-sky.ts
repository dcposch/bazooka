import env from '../env'
import shaders from '../shaders'
import Poly8 from '../../math/poly8'
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

var drawSkybox = env.regl<{}, {}, SkyProps>({
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
