import env from '../env'
import shaders from '../shaders'
import { DefaultContext, Vec4 } from 'regl'

const CROSSHAIR_RADIUS = 10 // Pixels
const CROSSHAIR_WIDTH = 1

export interface HitMarkerProps {
  color: Vec4
}

// Draws a crosshair in the middle of the screen.
export default env.regl<{}, {}, HitMarkerProps>({
  vert: shaders.vert.colorClip,
  frag: shaders.frag.color,
  attributes: {
    aPosition: function(context: DefaultContext) {
      var w = (CROSSHAIR_RADIUS / context.viewportWidth) * 2
      var h = (CROSSHAIR_RADIUS / context.viewportHeight) * 2
      // Bump it a half pixel to prevent blur
      var hw = 1 / context.viewportWidth
      var hh = 1 / context.viewportHeight
      return [[w + hw, hh], [-w + hw, hh], [hw, h + hh], [hw, -h + hh]]
    },
    aColor: function(context: DefaultContext, props: HitMarkerProps) {
      return [props.color, props.color, props.color, props.color]
    },
  },
  blend: {
    enable: true,
    func: {
      src: 'src alpha',
      dst: 'one minus src alpha',
    },
  },
  count: 4,
  primitive: 'lines',
  lineWidth: CROSSHAIR_WIDTH,
})
