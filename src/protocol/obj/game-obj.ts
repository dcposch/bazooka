import { VecXYZ, DirAzAlt, ObjSituation, PlayerMode, ObjType } from '../../types'
import { Vec3 } from 'regl'

export default class GameObj {
  type: ObjType
  key: string
  location: VecXYZ
  velocity: VecXYZ
  lastUpdateMs: number
  isDirty: boolean

  // Player
  name?: string
  direction?: DirAzAlt
  situation?: ObjSituation
  mode?: PlayerMode

  // Falling block
  rotAxis?: Vec3
  rotTheta?: number
  rotVel?: number
  typeIndex?: number

  constructor(key: string, type: ObjType) {
    this.key = key
    this.type = type
    this.location = { x: 0, y: 0, z: 0 }
    this.velocity = { x: 0, y: 0, z: 0 }
    this.lastUpdateMs = 0
    this.isDirty = true
  }
}
