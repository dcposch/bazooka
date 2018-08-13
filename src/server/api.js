var config = require('../config')
var FlexBuffer = require('../protocol/flex-buffer')
var ChunkIO = require('../protocol/chunk-io')

module.exports = {
  init: init,
  tick: tick,
  addConn: addConn,
  updateChunks: updateChunks,
  updateObjects: updateObjects
}

var CB = config.CHUNK_BITS

// Allocate once and re-use
var buf = new FlexBuffer()
var state = null

function init (s) {
  state = s
}

function addConn (conn) {
  state.conns.push(conn)
  conn.on('update', handleUpdate)
  conn.on('close', function () {
    var index = state.conns.indexOf(conn)
    console.log('Removing conn %d: %s', index, conn.player.name)
    state.conns.splice(index, 1)
  })

  conn.send({type: 'handshake', serverVersion: config.SERVER.VERSION})
  if (state.config.client) conn.send({type: 'config', config: state.config.client})
}

function tick () {
}

// Tell each conn about objects around them, including other players
function updateObjects () {
  // TODO: this runs in O(numConns ^ 2). Needs a better algorithm.
  var n = state.conns.length
  for (var i = 0; i < n; i++) {
    var conn = state.conns[i]
    var a = conn.player
    var objsToSend = []

    for (var j = 0; j < n; j++) {
      if (j === i) continue
      var b = state.conns[j].player
      if (!a.location || !b.location) continue
      if (!b.name) continue
      if (!isInRange(a.location, b.location)) continue

      objsToSend.push({
        // Common to all objects
        type: 'player',
        key: 'player-' + b.name,
        location: b.location,
        velocity: b.velocity,
        // Specific to the player object
        props: {
          name: b.name,
          direction: b.direction,
          situation: b.situation
        }
      })
    }

    sendObjects(conn, objsToSend)
  }
}

// Tell each conn about the blocks around them. Send chunks where a voxel has changed.
function updateChunks (tick) {
  // Figure out which conns need which chunks.
  // TODO: this runs in O(numConns * numChunks). Needs a better algorithm.
  var chunksToSend = []
  for (var j = 0; j < state.conns.length; j++) {
    chunksToSend.push([])
  }
  var chunks = state.world.chunks
  for (var i = 0; i < chunks.length; i++) {
    var chunk = chunks[i]
    if (chunk.dirty || !chunk.lastModified) {
      chunk.dirty = false
      chunk.lastModifiedTick = tick
    }
    var key = chunk.getKey()
    for (j = 0; j < state.conns.length; j++) {
      var conn = state.conns[j]
      var cts = chunksToSend[j]
      var loc = conn.player.location
      if (!loc) continue
      if (!isInRange(loc, chunk)) continue // player too far away
      if (conn.chunksSent[key] >= chunk.lastModified) continue // up-to-date
      cts.push(chunk)
      conn.chunksSent[key] = tick
    }
  }

  // Send chunk updates
  for (j = 0; j < state.conns.length; j++) {
    sendChunks(state.conns[j], chunksToSend[j])
  }
}

function isInRange (a, b) {
  var dx = (b.x >> CB) - (a.x >> CB)
  var dy = (b.y >> CB) - (a.y >> CB)
  var dz = (b.z >> CB) - (a.z >> CB)
  var r2 = dx * dx + dy * dy + dz * dz
  var rmax = config.SERVER.CHUNK_SEND_RADIUS
  return r2 < rmax * rmax
}

function sendObjects (conn, objects) {
  if (!objects.length) return
  conn.send({
    type: 'objects',
    objects: objects
  })
}

function sendChunks (conn, chunks) {
  if (!chunks.length) return
  console.log('Sending %d chunks to %s', chunks.length, conn.player.name)
  buf.reset()
  ChunkIO.write(buf, chunks)
  conn.send(buf.slice())
}

function handleUpdate (message) {
  message.commands.forEach(function (command) {
    switch (command.type) {
      case 'set':
        return handleSet(command)
      default:
        console.error('Ignoring unknown command type ' + command.type)
    }
  })
}

function handleSet (cmd) {
  state.world.setVox(cmd.x, cmd.y, cmd.z, cmd.v)
}
