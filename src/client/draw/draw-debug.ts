import env from '../env'
import shaders from '../shaders'
import vox from '../../protocol/vox'
import { DefaultContext } from 'regl'
import { VecXYZ, GameState } from '../../types'

// const version = 'TODO' // Read from package.json

const canvas = createHiddenCanvas()
const context2D = createContext2D(canvas)
const texture = env.regl.texture(canvas)

interface DrawDebugProps {
  gameState: GameState
}

// Show a debugging heads-up display.
// Overlays white text onto the top left corner of the screen.
export default env.regl<{}, {}, DrawDebugProps>({
  vert: shaders.vert.uvClip,
  frag: shaders.frag.texture,
  attributes: {
    aPosition: function(context: DefaultContext) {
      const w = (canvas.width / context.viewportWidth) * 2
      const h = (canvas.height / context.viewportHeight) * 2
      return [[-1, 1], [-1 + w, 1], [-1 + w, 1 - h], [-1 + w, 1 - h], [-1, 1 - h], [-1, 1]]
    },
    aUV: [[0, 0], [1, 0], [1, 1], [1, 1], [0, 1], [0, 0]],
  },
  uniforms: {
    uTexture: function(context: DefaultContext, props: DrawDebugProps) {
      const text = createDebugText(props.gameState)
      context2D.clearRect(0, 0, canvas.width, canvas.height)
      context2D.fillStyle = 'rgba(0, 0, 0, 0.6)'
      context2D.fillRect(0, 0, canvas.width, canvas.height)
      context2D.fillStyle = '#fff'
      for (let i = 0; i < text.length; i++) context2D.fillText(text[i], 10.5, 25.5 + 20 * i)
      texture(canvas)
      return texture
    },
  },
  blend: {
    enable: true,
    func: {
      srcRGB: 'src alpha',
      srcAlpha: 'src alpha',
      dstRGB: 'one minus src alpha',
      dstAlpha: 'one',
    },
  },
  count: 6,
})

function createHiddenCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 450
  canvas.height = 170
  return canvas
}

function createContext2D(canvas: HTMLCanvasElement) {
  const context2D = canvas.getContext('2d')
  if (!context2D) {
    throw new Error('failed to get context2D')
  }
  context2D.font = '16px monospace'
  context2D.fillStyle = '#fff'
  return context2D
}

function createDebugText(state: any) {
  const ret = [] as string[]
  ret.push('BAZOOKA CITY')

  const loc = state.player.location
  const vel = state.player.velocity
  const dir = state.player.direction
  ret.push('Location: ' + pointToString(loc, 1) + ', d/dt ' + pointToString(vel, 0))
  ret.push('Azith: ' + toDeg(dir.azimuth) + '°, alt: ' + toDeg(dir.altitude) + '°' + ', ' + state.player.situation)

  const mem = (window.performance as any).memory
  if (mem) {
    ret.push(
      'JS Heap: ' +
        (mem.usedJSHeapSize >> 20) +
        ' / ' +
        (mem.totalJSHeapSize >> 20) +
        ' MB, FPS: ' +
        Math.round(state.perf.fps)
    )
  }

  let totalVerts = 0
  const chunks = state.world.chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    totalVerts += chunk.mesh.opaque ? chunk.mesh.opaque.count : 0
    totalVerts += chunk.mesh.trans ? chunk.mesh.trans.count : 0
  }
  ret.push(
    'Chunks: ' +
      state.world.chunks.length +
      ', verts: ' +
      k(totalVerts) +
      ', draw ' +
      state.perf.draw.chunks +
      ' / ' +
      k(state.perf.draw.verts)
  )

  if (state.player.lookAtBlock) {
    const b = state.player.lookAtBlock
    ret.push('Looking at: ' + pointToString(b.location, 0) + ' ' + vox.TYPES[b.voxel].name)
  } else {
    ret.push('Looking at: sky')
  }

  return ret
}

// Returns eg "25k" for 25181
function k(v: number) {
  return Math.round(v / 1000) + 'k'
}

// Returns "x,y,z". Displays d decimal points
function pointToString(loc: VecXYZ, d: number) {
  return loc.x.toFixed(d) + ', ' + loc.y.toFixed(d) + ', ' + loc.z.toFixed(d)
}

// Radians to degrees, rounded to the nearest integer
function toDeg(radians: number) {
  return Math.round((radians * 180) / Math.PI)
}
