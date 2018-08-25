import { VecXYZ, DirAzAlt, PlayerSituation, PlayerMode } from '../../types'
import { Vec3 } from 'regl'

export default class GameObj {
  type: string
  key: string
  location: VecXYZ
  velocity: VecXYZ
  lastUpdateMs: number

  // Player
  name?: string
  direction?: DirAzAlt
  situation?: PlayerSituation
  mode?: PlayerMode

  // Falling block
  rotAxis?: Vec3
  rotTheta?: number
  rotVel?: number
  typeIndex?: number

  constructor(key: string, type: string) {
    this.key = key
    this.type = type
    this.location = { x: 0, y: 0, z: 0 }
    this.velocity = { x: 0, y: 0, z: 0 }
    this.lastUpdateMs = 0
  }
}
