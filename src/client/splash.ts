import sound from './sound'
import env from './env'
import Player from './models/player'

module.exports = {
  init: init,
  showError: showError,
}

// Spash screen
var divSplash
var inputName
var btnStart
var divControls

// Error overlay
var divError

// Game canvas
var canvas

var state

function init(st) {
  state = st

  divSplash = document.querySelector('div.splash')
  inputName = document.querySelector('input.splash-input-name')
  btnStart = document.querySelector('button.splash-btn-start')
  divControls = document.querySelector('div.splash-controls')
  divError = document.querySelector('div.error')
  canvas = document.querySelector('canvas')

  // Focus player name entry
  inputName.focus()

  // First, the player has to type in their name...
  inputName.addEventListener('keyup', updateSplash)
  window.setInterval(updateSplash, 500)

  // Once they click start, drop them into the game
  btnStart.addEventListener('click', enterLobby)

  // DBG: dev quickstart
  inputName.value = 'test'
  btnStart.click()
}

function updateSplash(e) {
  if (state.startTime > 0) return // Splash screen already gone

  var name = inputName.value.replace(/[^A-Za-z0-9 ]/g, '')
  name = name.toLowerCase()
  if (name !== inputName.value) inputName.value = name

  var ready = name.length >= 3 && name.length < 20
  btnStart.classList.toggle('show', ready)
  divControls.classList.toggle('show', ready)

  if (ready && e && e.key === 'Enter') enterLobby()
}

function enterLobby() {
  var bgImg = 'url(img/bazooka-city-dark.gif), url(img/bazooka-city-title.png)'
  divSplash.style.setProperty('background-image', bgImg)
  document.querySelector('.splash-start').remove()

  // TODO: get lobby / game  state from server
  window.setTimeout(startGame, 2000)
}

// ...then, click to start
function startGame() {
  divSplash.remove()

  state.player.name = inputName.value
  state.objects.self = new Player(state.player.name)
  state.startTime = new Date().getTime()

  canvas.addEventListener('click', function() {
    if (state.error) return
    env.shell.fullscreen = true
    env.shell.pointerLock = true
  })

  var music = state.config && state.config.music
  if (music) sound.play(music.url, music.time)
}

// Kill the game on error (eg 'connection lost')
// Player has to refresh the page.
function showError(message, err) {
  console.error(message)
  if (err) console.error(err)
  if (state.error) return
  state.error = { message: message }
  if (divSplash) divSplash.remove()
  divError.classList.add('show')
  divError.innerText = message
  env.shell.fullscreen = false
  env.shell.pointerLock = false
}
