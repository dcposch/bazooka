import env from '../env'
import camera from '../camera'
import { DefaultContext } from 'regl'

interface ScopeProps {
  startTime: number
}

export default env.regl({
  uniforms: {
    uMatrix: camera.updateMatrix,
    uLightDir: [0.6, 0.48, 0.64],
    uLightDiffuse: [1, 1, 0.9],
    uLightAmbient: [0.6, 0.6, 0.6],
    uAnimateT: function(context: DefaultContext) {
      return context.time
    },
    uDepthFog: function(context: DefaultContext, props: ScopeProps) {
      var secs = (new Date().getTime() - props.startTime) * 0.001
      var t = 1.0 - Math.exp(-secs * 0.1)
      return [1.0, 1.0, 1.0, 400.0 * t]
    },
  },
  blend: {
    enable: false,
  },
})
