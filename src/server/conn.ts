import EventEmitter from 'events'
import FlexBuffer from '../protocol/flex-buffer'
import ChunkIO from '../protocol/chunk-io'
import config from '../config'
import Chunk from '../protocol/chunk'
import { GameCmd, GameCmdHandshake } from '../types'
import WebSocket from 'ws'

import GameObj from '../protocol/obj/game-obj'
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

    ws.on('message', this.handleMessage)
    ws.on('close', this.handleClose)
  }

  send(message: Object | Uint8Array | string) {
    if (this.closed) return console.error('Ignoring message, socket closed')
    try {
      let toSend
      if (message instanceof Uint8Array) {
        toSend = message
      } else if (typeof message === 'string') {
        toSend = message
      } else {
        toSend = JSON.stringify(message)
      }

      this.ws.send(toSend)
      this.perf.messagesSent++
      this.perf.bytesSent += toSend.length
    } catch (e) {
      console.error('websocket send failed', e)
    }
  }

  die(error: Error) {
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

  sendObjects(objects: GameObj[]) {
    const msg = {
      type: 'objects',
      objects,
    }
    this.send(msg)
  }

  sendStatus(gameStatus: string, alivePlayers: number, totalPlayers: number) {
    this.send({
      type: 'status',
      gameStatus,
      alivePlayers,
      totalPlayers,
    })
  }

  sendChunks(chunks: Chunk[]) {
    if (!chunks.length) return
    buf.reset()
    ChunkIO.write(buf, chunks)
    this.send(buf.slice())
  }

  handleClose = () => {
    this.closed = true
    this.emit('close')
  }

  handleMessage = (data: string | Buffer) => {
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

function handleBinaryMessage(conn: Conn, data: Buffer) {
  console.error('Ignoring unimplemented binary message, length ' + data.length)
}

function handleJsonMessage(conn: Conn, obj: GameCmd) {
  switch (obj.type) {
    case 'handshake':
      return handleHandshake(conn, obj as GameCmdHandshake)
    case 'update':
      return conn.emit('update', obj)
    default:
      console.error('Ignoring unknown message type ' + obj.type)
  }
}

function handleHandshake(conn: Conn, obj: GameCmdHandshake) {
  conn.clientVersion = obj.clientVersion
}

export default Conn
