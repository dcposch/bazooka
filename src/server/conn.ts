import EventEmitter from 'events'
import FlexBuffer from '../protocol/flex-buffer'
import ChunkIO from '../protocol/chunk-io'
import config from '../config'

// Allocate once and re-use
var buf = new FlexBuffer()

interface Perf {
  messagesSent: number
  messagesReceived: number
  bytesSent: number
  bytesReceived: number
}

// Represents one client (player / spectator / hasn't signed in yet / w/e) connected to this game server.
// Responsibilities:
// - Track connection state
// - Track client version
// - Low-level send and receive messages
// Creates a new client handle from a new websocket connection
class Conn extends EventEmitter {
  // A new client just connected, here's the websocket
  ws: WebSocket
  closed: boolean
  clientVersion: any
  perf: Perf
  error: any
  constructor(ws: WebSocket) {
    super()
    this.ws = ws
    this.closed = false
    // Client version. Unknown at first, will be set during the handshake.
    this.clientVersion = null
    // Track performance and bandwidth
    this.perf = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
    }
    this.error = null
    ws.on('message', handleMessage.bind(this))
    ws.on('close', handleClose.bind(this))
  }

  send(message) {
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

  die(error) {
    if (this.error) return
    this.error = error
    this.send({ type: 'error', error: error })
    setTimeout(this.destroy.bind(this), 1000)
  }

  destroy() {
    this.ws.close()
  }

  sendHandshake() {
    this.send({ type: 'handshake', serverVersion: config.SERVER.VERSION })
  }

  sendObjects(objects) {
    if (!objects.length) return
    this.send({
      type: 'objects',
      objects: objects,
    })
  }

  sendChunks(chunks) {
    if (!chunks.length) return
    buf.reset()
    ChunkIO.write(buf, chunks)
    this.send(buf.slice())
  }

  handleClose() {
    this.closed = true
    this.emit('close')
  }

  handleMessage(data) {
    try {
      this.perf.messagesReceived++
      this.perf.bytesReceived += data.length // Approximate. Doesn't count overhead or non-ASCII chars
      if (typeof data !== 'string') handleBinaryMessage(this, data)
      else handleJsonMessage(this, JSON.parse(data))
    } catch (e) {
      console.error('error handling client message', e)
    }
  }
}

function handleBinaryMessage(conn: Conn, data) {
  console.error('Ignoring unimplemented binary message, length ' + data.length)
}

function handleJsonMessage(conn: Conn, obj) {
  switch (obj.type) {
    case 'handshake':
      return handleHandshake(conn, obj)
    case 'update':
      return conn.emit('update', obj)
    default:
      console.error('Ignoring unknown message type ' + obj.type)
  }
}

function handleHandshake(conn: Conn, obj) {
  conn.clientVersion = obj.clientVersion
}

export default Conn
