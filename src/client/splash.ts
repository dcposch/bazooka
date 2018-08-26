import sound from './sound'
import env from './env'

export default {
  init: init,
  showError: showError,
  startGame: startGame,
  updatePlayers: updatePlayers,
}

// Splash screen
let divSplash: HTMLDivElement
let inputName: HTMLInputElement
let btnStart: HTMLButtonElement
let divControls: HTMLDivElement

// Error overlay
let divError: HTMLDivElement

// Game canvas
let canvas: HTMLCanvasElement

let state: any

function init(st: any) {
  state = st

  divSplash = document.querySelector('div.splash') as HTMLDivElement
  inputName = document.querySelector('input.splash-input-name') as HTMLInputElement
  btnStart = document.querySelector('button.splash-btn-start') as HTMLButtonElement
  divControls = document.querySelector('div.splash-controls') as HTMLDivElement
  divError = document.querySelector('div.error') as HTMLDivElement
  canvas = document.querySelector('canvas') as HTMLCanvasElement

  // Focus player name entry
  inputName.focus()

  // First, the player has to type in their name...
  inputName.addEventListener('keyup', updateSplash)
  window.setInterval(updateSplash, 500)

  // Once they click start, drop them into the game
  btnStart.addEventListener('click', enterLobby)

  // DBG: dev quickstart
  // inputName.value = 'test'
  // btnStart.click()
}

function updateSplash(e?: KeyboardEvent) {
  if (state.startTime > 0) return // Splash screen already gone

  var name = inputName.value.replace(/[^A-Za-z0-9 ]/g, '')
  name = name.toLowerCase()
  if (name !== inputName.value) inputName.value = name

  var ready = name.length >= 3 && name.length < 20
  btnStart.classList.toggle('show', ready)
  divControls.classList.toggle('show', ready)

  if (ready && e && e.key === 'Enter') enterLobby()
}

function updatePlayers(totalPlayers: number, maxPlayers: number) {
  console.log(totalPlayers, maxPlayers)
  ;(document.querySelector('div.splash-lobby-players') as HTMLDivElement).innerHTML = totalPlayers + ' of ' + maxPlayers
}

function enterLobby() {
  var bgImg = 'url(img/bazooka-city-dark.gif), url(img/bazooka-city-title.png)'
  divSplash.style.setProperty('background-image', bgImg)
  document.querySelector('.splash-start')!.remove()
  state.socket.send({
    type: 'activate',
  })

  // TODO: get lobby / game  state from server
  // window.setTimeout(startGame, 2000)
}

// ...then, click to start
function startGame() {
  divSplash.remove()

  state.player.name = inputName.value

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
function showError(message: string, err?: Error) {
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
