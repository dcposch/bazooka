import GameObj from './game-obj'
import vec3 from 'gl-vec3'
import { Vec3 } from 'regl'
import { ObjType } from '../../types'

export default class FallingBlockObj extends GameObj {
  rotAxis: Vec3
  rotTheta: number
  rotVel: number
  typeIndex: number

  constructor(key: string) {
    super(key, ObjType.FALLING_BLOCK)

    this.rotAxis = vec3.create()
    this.rotTheta = 0
    this.rotVel = 0
    this.typeIndex = 0
  }
}
