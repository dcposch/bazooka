import uuid from 'uuid/v4'
import Player from './player'
import Conn from './conn'

export default class PlayerConn {
  /** Each connection gets a unique ID */
  id: string

  /** Wrapped websocket connection */
  conn: Conn

  /** Keep track of what chunks we've sent to whom. Maps chunkKey to tick. */
  chunksSent: { [key: string]: number }

  /** Bazooka player */
  player: Player

  constructor(conn: any) {
    this.id = uuid()
    this.conn = conn
    this.chunksSent = {}
    this.player = new Player()
  }
}
