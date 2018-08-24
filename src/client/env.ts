import regl from 'regl'
import shell from 'game-shell'
import config from '../config'

const canvas = document.querySelector('canvas') || undefined
if (!canvas) {
  throw new Error('could not find canvas')
}

const INITIAL_W = canvas.width
const INITIAL_H = canvas.height
const FULLSCREEN_W = 960

const env = {
  canvas: canvas,
  regl: regl({
    canvas,
    optionalExtensions: ['EXT_texture_filter_anisotropic', 'EXT_disjoint_timer_query'],
  }),
  shell: shell({
    element: canvas,
    bindings: config.KEYBINDINGS,
    tickRate: config.TICK_INTERVAL * 1000,
  }),
  resizeCanvasIfNeeded: resizeCanvasIfNeeded,
}

// Don't intercept standard browser keyboard shortcuts
env.shell.preventDefaults = false

// For easier debugging
;(window as any).env = env

// Resize the canvas when going into or out of fullscreen
function resizeCanvasIfNeeded() {
  var w = INITIAL_W
  var h = INITIAL_H

  if (env.shell.fullscreen) {
    w = FULLSCREEN_W
    h = Math.floor(FULLSCREEN_W * Math.min(1.0, window.innerHeight / window.innerWidth))
  }

  if (env.canvas.width !== w || env.canvas.height !== h) {
    env.canvas.width = w
    env.canvas.height = h
    console.log('Set canvas size %d x %d', w, h)
  }
  env.canvas.classList.toggle('fullscreen', env.shell.fullscreen)
}

export default env
