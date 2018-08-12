var http = require('http')
var WebSocketServer = require('ws').Server
var express = require('express')
var config = require('../config')
var World = require('../world')
var Client = require('./client')
var gen = require('../gen')
var monitor = require('./monitor')
var api = require('./api')
var compression = require('compression')

var state = {
  clients: [],
  world: new World(),
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
    var client = new Client(ws)
    api.addClient(client)
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

  process.nextTick(tick)
}

// Update the world, handle client commands, send client updates
function tick () {
  // Track performance
  var now = new Date()
  var dt = (now.getTime() - state.perf.lastTickTime) / 1000
  state.perf.tps = 0.99 * state.perf.tps + 0.01 / dt // Exponential moving average
  state.perf.lastTickTime = now.getTime()

  // Generate new areas of the world on demand, as players explore them
  if (state.tick % 10 === 0) gen.generateWorld(state)

  // Talk to clients
  api.tick()
  // DBG only one chunk update per second to debug client side prediction
  if (state.tick % 10 === 0) api.updateChunks(now.getTime())
  api.updateObjects(now.getTime())

  // Run up to 10 ticks per second, depending on server load
  setTimeout(tick, 100)
  state.tick++
  if (state.tick % 100 === 0) console.log('tick %s, tps %s', state.tick, state.perf.tps)
}
