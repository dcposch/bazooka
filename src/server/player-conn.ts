import uuid from 'uuid/v4'
import Conn from './conn'
import PlayerObj from '../protocol/obj/player-obj'

export default class PlayerConn {
  /** Each connection gets a unique ID */
  id: string

  /** Wrapped websocket connection */
  conn: Conn

  /** Keep track of what chunks we've sent to whom. Maps chunkKey to tick. */
  chunksSent: { [key: string]: number }

  /** Bazooka player */
  player: PlayerObj

  constructor(conn: any) {
    this.id = uuid()
    this.conn = conn
    this.chunksSent = {}
    this.player = new PlayerObj(this.id, 'anon')
  }
}
