import http from 'http'
import express from 'express'
import config from '../config'
import BazookaGame from './bazooka-game'
import Conn from './conn'
import PlayerConn from './player-conn'
import monitor from './monitor'
import compression from 'compression'
import WebSocket from 'ws'

var state = {
  game: new BazookaGame(),
  tick: 0,
  perf: {
    lastTickTime: new Date().getTime(),
    tps: 0,
  },
}

main()

function main() {
  // Serve websocket API
  var httpServer = http.createServer()
  var wsServer = new WebSocket.Server({ server: httpServer })
  wsServer.on('connection', addWebsocketConn)

  // Serve the client files
  var app = express()
  app.use(compression())
  app.use(express.static('dist'))
  app.use(express.static('static'))
  app.use('/monitor', monitor.init(state))
  httpServer.on('request', app)

  httpServer.listen(config.SERVER.PORT, function() {
    console.log('Listening on ' + JSON.stringify(httpServer.address()))
  })

  // Start the game
  state.game.generate()
  process.nextTick(tick)
}

// Update the world, handle client commands, send client updates
function tick() {
  // Track performance
  var nowMs = new Date().getTime()
  var dt = (nowMs - state.perf.lastTickTime) / 1000
  state.perf.tps = 0.99 * state.perf.tps + 0.01 / dt // Exponential moving average
  state.perf.lastTickTime = nowMs

  // Update the game
  state.game.tick(state.tick, Math.min(1, Math.max(0.01, dt)))

  // Run up to 10 ticks per second, depending on server load
  setTimeout(tick, 15) // Tick fast for smooth physics
  state.tick++
  if (state.tick % 1000 === 0) console.log('tick %s, tps %s', state.tick, state.perf.tps)
}

// Handles a new websocket connection = a player opening the game
function addWebsocketConn(ws: WebSocket) {
  // Send handshake, maybe client config
  var conn = new Conn(ws)
  conn.sendHandshake()

  // For now, create a new player immediately for every conn, add to single game
  var player = new PlayerConn(conn)
  state.game.addPlayer(player)

  conn.on('close', function() {
    state.game.removePlayer(player.id)
  })
}
