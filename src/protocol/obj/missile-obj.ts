import GameObj from './game-obj'
import { ObjType } from '../../types'

export default class MissileObj extends GameObj {
  constructor(key: string) {
    super(key, ObjType.MISSILE)
  }
}
