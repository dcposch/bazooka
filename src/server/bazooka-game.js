var World = require('../world')
var gen = require('../gen')
var config = require('../config')

module.exports = BazookaGame

// Represents one Bazooka City game.
// Battle royale. Players land on a procgen voxel sky island and fight until one is left.
//
// Responsible for:
// - Managing game lifecycle, from LOBBY to ACTIVE to COMPLETED
// - Generating the island
// - Slowly disintegrating the island so it gets smaller and smaller over time
// - Enforcing game rules, calculating physics
// - Knowing how many players are left (LOBBY / ACTIVE) or who won (COMPLETED)
//
// Not responsible for:
// - Sending or receiving messages. See server and api for that.
function BazookaGame (config) {
  this.playerConns = []
  this.world = new World()
  this.maxPlayers = config.maxPlayers
  this.status = 'ACTIVE' // TODO
}

BazookaGame.prototype.generate = function generate () {
  console.log('generating island')
  var cs = config.CHUNK_SIZE
  var genRad = config.BAZOOKA.GEN_RADIUS_CHUNKS
  for (var x = -cs * genRad; x < cs * genRad; x++) {
    for (var y = -cs * genRad; y < cs * genRad; y++) {
      gen.generateWorldAt(this.world, x, y)
    }
  }
}

BazookaGame.prototype.addPlayer = function addPlayer (playerConn) {
  this.playerConns.push(playerConn)
}

BazookaGame.prototype.getNumPlayersAlive = function getNumPlayersAlive () {
  var ret = 0
  for (var i = 0; i < this.conns.length; i++) {
    ret += this.conns[i].player.health > 0 ? 1 : 0
  }
  return ret
}

// Update the world, objects, and players
BazookaGame.prototype.tick = function tick () {
  // Kill players who fall
  this.playersConns.forEach(function (pc) {
    var loc = pc.player.location
    if (loc && loc.z < -100) pc.conn.die({message: 'you fell'})
  })
}
