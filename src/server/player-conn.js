var uuid = require('uuid/v4')
var Player = require('./player')

module.exports = PlayerConn

function PlayerConn (conn) {
  // Wrapped websocket connection
  this.conn = conn

  // Each connection gets a unique ID
  this.id = uuid()

  // Keep track of what chunks we've sent to whom. Maps chunkKey to tick.
  this.chunksSent = {}

  // Bazooka player
  this.player = new Player()
}
