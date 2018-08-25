declare module 'gl-vec2' {
  import { Vec2 } from 'regl'

  const GlVec2: {
    clone: (v: Vec2 | [number, number]) => Vec2
    create: () => Vec2
    copy: (v1: Vec2, v2: Vec2) => void
  }

  export default GlVec2
}
