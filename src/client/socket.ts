import EventEmitter from 'events'
import config from '../config'

// Maintains a websocket to a server
// Emits four events: open, close, json, and binary
export default class Socket extends EventEmitter {
  clientVersion: number
  serverVersion?: number
  ws: WebSocket

  constructor() {
    super()

    this.clientVersion = config.CLIENT.VERSION
    this.serverVersion = undefined

    var wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    var ws = new WebSocket(wsProto + '/' + window.location.host)
    ws.binaryType = 'arraybuffer'
    this.ws = ws

    ws.onopen = this._onOpen
    ws.onmessage = this._onMessage
    ws.onclose = this._onClose
  }

  _onOpen = () => {
    this.emit('open')
    this.send({ type: 'handshake', clientVersion: this.clientVersion })
  }

  _onMessage = (e: MessageEvent) => {
    if (typeof e.data === 'string') {
      const msg = JSON.parse(e.data)
      if (msg.type === 'handshake') this.serverVersion = msg.serverVersion
      else this.emit('json', msg)
    } else {
      this.emit('binary', e.data)
    }
  }

  _onClose = () => {
    this.emit('close')
  }

  isReady() {
    return this.ws && this.ws.readyState === this.ws.OPEN
  }

  send(msg: Object) {
    if (!this.ws) throw new Error('not connected')
    if (this.ws.readyState !== this.ws.OPEN) throw new Error('websocket state: ' + this.ws.readyState)
    if (msg instanceof Uint8Array) this.ws.send(msg)
    else this.ws.send(JSON.stringify(msg))
  }
}
