var EventEmitter = require('events')

// Creates a new client handle from a new websocket connection
module.exports = Conn

// Represents one client (player / spectator / hasn't signed in yet / w/e) connected to this game server.
// Responsibilities:
// - Track connection state
// - Track client version
// - Low-level send and receive messages
function Conn (ws) {
  EventEmitter.call(this)

  // A new client just connected, here's the websocket
  this.ws = ws
  this.closed = false
  // Client version. Unknown at first, will be set during the handshake.
  this.clientVersion = null
  // Track performance and bandwidth
  this.perf = {
    messagesSent: 0,
    messagesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0
  }
  this.error = null

  ws.on('message', handleMessage.bind(this))
  ws.on('close', handleClose.bind(this))
}

Conn.prototype = Object.create(EventEmitter.prototype)

Conn.prototype.send = function (message) {
  if (this.closed) return console.error('Ignoring message, socket closed')
  if (!(message instanceof Uint8Array)) message = JSON.stringify(message)
  try {
    this.ws.send(message)
    this.perf.messagesSent++
    this.perf.bytesSent += message.length
  } catch (e) {
    console.error('websocket send failed', e)
  }
}

Conn.prototype.die = function (error) {
  if (this.error) return
  this.error = error
  this.send({type: 'error', error: error})
  setTimeout(this.destroy.bind(this), 1000)
}

Conn.prototype.destroy = function () {
  this.ws.close()
}

function handleClose () {
  this.closed = true
  this.emit('close')
}

function handleMessage (data) {
  try {
    this.perf.messagesReceived++
    this.perf.bytesReceived += data.length // Approximate. Doesn't count overhead or non-ASCII chars
    if (typeof data !== 'string') handleBinaryMessage(this, data)
    else handleJsonMessage(this, JSON.parse(data))
  } catch (e) {
    console.error('error handling client message', e)
  }
}

function handleBinaryMessage (conn, data) {
  console.error('Ignoring unimplemented binary message, length ' + data.length)
}

function handleJsonMessage (conn, obj) {
  switch (obj.type) {
    case 'handshake':
      return handleHandshake(conn, obj)
    case 'update':
      return this.emit('update', obj)
    default:
      console.error('Ignoring unknown message type ' + obj.type)
  }
}

function handleHandshake (conn, obj) {
  conn.clientVersion = obj.clientVersion
}

function handleUpdate (conn, obj) {
  // TODO: doing this 10x per second per client is not ideal. use binary.
  // TODO: validation
  if (!conn.player.name && obj.player.name) console.log('Player %s joined', obj.player.name)
  Object.assign(conn.player, obj.player)
  conn.emit('update', obj)
}
