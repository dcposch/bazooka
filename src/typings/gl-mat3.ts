declare module 'gl-mat3' {
  import { Vec3, Mat4, Mat3 } from 'regl'

  const GlMat3: {
    create: () => Mat3
    identity: (o: Mat3) => void
    rotate: (o: Mat3, i: Mat3, theta: number, axis: Vec3) => void
  }

  export default GlMat3
}
