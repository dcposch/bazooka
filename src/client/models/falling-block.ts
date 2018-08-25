import GameObj from './game-obj'
import vec3 from 'gl-vec3'
import { Vec3 } from 'regl'

export default class FallingBlock extends GameObj {
  rotAxis: Vec3
  rotTheta: number
  rotVel: number
  typeIndex: number

  constructor(key: string) {
    super(key, 'falling-block')

    this.rotAxis = vec3.create()
    this.rotTheta = 0
    this.rotVel = 0
    this.typeIndex = 0
  }

  tick(dt: number) {}
  draw() {}
  destroy() {}
}
