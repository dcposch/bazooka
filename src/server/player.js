module.exports = Player

function Player () {
  this.name = 'unknown'
  this.location = { x: 0, y: 0, z: 0 }
  this.direction = { azimuth: 0, altitude: 0 }
  this.velocity = { x: 0, y: 0, z: 0 }
  this.situation = 'airborne'
  this.health = 100
}
