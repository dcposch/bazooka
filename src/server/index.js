var http = require('http')
var WebSocketServer = require('ws').Server
var express = require('express')
var config = require('../config')
var BazookaGame = require('./bazooka-game')
var Conn = require('./conn')
var PlayerConn = require('./player-conn')
var monitor = require('./monitor')
var api = require('./api')
var compression = require('compression')

var state = {
  game: new BazookaGame(),
  tick: 0,
  perf: {
    lastTickTime: new Date().getTime(),
    tps: 0
  },
  config: {}
}

main()

function main () {
  // Serve websocket API
  api.init(state)
  var httpServer = http.createServer()
  var wsServer = new WebSocketServer({server: httpServer})
  wsServer.on('connection', function (ws) {
    var conn = new Conn(ws)
    api.addConn(conn)

    // For now, create a new player immediately for every conn, add to single game
    var player = new PlayerConn(conn)
    state.game.addPlayer(player)
  })

  // Serve the client files
  var app = express()
  app.use(compression())
  app.use(express.static('build'))
  app.use(express.static('static'))
  app.use('/monitor', monitor.init(state))
  httpServer.on('request', app)

  httpServer.listen(config.SERVER.PORT, function () {
    console.log('Listening on ' + JSON.stringify(httpServer.address()))
  })

  // Generate the world
  state.game.generate()

  // Start the tick
  process.nextTick(tick)
}

// Update the world, handle client commands, send client updates
function tick () {
  // Track performance
  var nowMs = new Date().getTime()
  var dt = (nowMs - state.perf.lastTickTime) / 1000
  state.perf.tps = 0.99 * state.perf.tps + 0.01 / dt // Exponential moving average
  state.perf.lastTickTime = nowMs

  // Update the game
  state.game.tick(nowMs)

  // Talk to clients
  api.tick()
  api.updateChunks(nowMs)
  api.updateObjects(nowMs)

  // Run up to 10 ticks per second, depending on server load
  setTimeout(tick, 100)
  state.tick++
  if (state.tick % 100 === 0) console.log('tick %s, tps %s', state.tick, state.perf.tps)
}
