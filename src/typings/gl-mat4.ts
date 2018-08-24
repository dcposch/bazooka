declare module 'gl-mat4' {
  import { Vec3, Mat4, Mat3 } from 'regl'

  const GlMat4: {
    create: () => Mat4
    identity: (o: Mat4) => void
    translate: (o: Mat4, i: Mat4, v: Vec3) => void
    rotate: (o: Mat4, i: Mat4, theta: number, axis: Vec3) => void
    rotateX: (o: Mat4, i: Mat4, theta: number) => void
    rotateY: (o: Mat4, i: Mat4, theta: number) => void
    rotateZ: (o: Mat4, i: Mat4, theta: number) => void
    scale: (o: Mat4, i: Mat4, factor: Vec3) => void

    multiply: (o: Mat4, i: Mat4, m: Mat4) => void
    perspective: (o: Mat4, a: number, b: number, c: number, d: number) => void
  }

  export default GlMat4
}
