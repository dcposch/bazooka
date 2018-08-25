import GameObj from './game-obj'

export default class MissileObj extends GameObj {
  constructor(key: string) {
    super(key, 'missile')
  }
}
