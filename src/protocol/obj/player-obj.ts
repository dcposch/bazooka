import { toCartesian } from '../../math/coordinates'
import { PlayerMode, DirAzAlt, ObjSituation } from '../../types'
import GameObj from './game-obj'

export default class PlayerObj extends GameObj {
  mode: PlayerMode
  name: string
  direction: DirAzAlt
  situation: ObjSituation
  walk: number

  constructor(key: string, name: string) {
    super(key, 'player')

    // Which mode you're in-- bazooka, commando, ...
    this.mode = PlayerMode.BAZOOKA
    this.situation = ObjSituation.AIRBORNE
    this.direction = { azimuth: 0, altitude: 0 }
    this.walk = 0
    this.name = ''
  }

  tick(dt: number) {
    var vel = this.velocity
    var props = this
    var cdir = toCartesian(props.direction.azimuth, 0, 1)

    // Update bones
    var dStand = 0.15
    var forwardSpeed = cdir[0] * vel.x + cdir[1] * vel.y
    if (Math.abs(forwardSpeed) < 1) {
      // Stand
      if (props.walk < Math.PI && props.walk > dStand) props.walk -= dStand
      else if (props.walk > Math.PI && props.walk < 2 * Math.PI - dStand) props.walk += dStand
    } else {
      // Walk
      var dWalk = forwardSpeed * dt * 1.5
      props.walk = (props.walk + dWalk + 2 * Math.PI) % (2 * Math.PI)
    }
  }
}
