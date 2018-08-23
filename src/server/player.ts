import { PointXYZ } from '../types'

interface Direction {
  azimuth: number
  altitude: number
}

class Player {
  name: string
  location: PointXYZ
  direction: Direction
  velocity: PointXYZ
  situation: string
  health: number

  constructor() {
    this.name = 'unknown'
    this.location = { x: 0, y: 0, z: 0 }
    this.direction = { azimuth: 0, altitude: 0 }
    this.velocity = { x: 0, y: 0, z: 0 }
    this.situation = 'airborne'
    this.health = 100
  }
}

export default Player
