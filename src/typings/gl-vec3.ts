declare module 'gl-vec3' {
  import { Vec3, Mat4, Mat3 } from 'regl'

  const GlVec3: {
    create: () => Vec3
    clone: (v: Vec3) => Vec3
    fromValues: (x: number, y: number, z: number) => Vec3
    dot: (a: Vec3, b: Vec3) => number
    copy: (o: Vec3, i: Vec3) => void
    transformMat4: (o: Vec3, i: Vec3, m: Mat4) => void
    transformMat3: (o: Vec3, i: Vec3, m: Mat3) => void
    scale: (o: Vec3, i: Vec3, v: number) => void
  }

  export default GlVec3
}
