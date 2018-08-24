declare module 'gl-vec2' {
  import { Vec2 } from 'regl'

  const GlVec2: {
    clone: (v: Vec2 | [number, number]) => Vec2
  }

  export default GlVec2
}
