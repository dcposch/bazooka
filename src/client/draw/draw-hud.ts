import env from '../env'
import shaders from '../shaders'
import textures from '../textures'
import { DefaultContext } from 'regl'
import { PlayerMode, GameStatus } from '../../types'

var STATUS_WIDTH_PX = 66 * 2
var STATUS_HEIGHT_PX = 32 * 2
var HEALTH_WIDTH_PX = 60 * 5
var HEALTH_HEIGHT_PX = 5 * 5
var NUM_LEFT_WIDTH_PX = 60 * 2
var NUM_LEFT_HEIGHT_PX = 32 * 2

var STATUS_OFFSETS: { [index: string]: number } = {
  commando: 2,
  bazooka: 16,
}

export interface HudProps {
  health: number
  mode: PlayerMode
  numPlayersLeft: number
  gameStatus: GameStatus
  bazookaJuice: number
}

/**
 * Draws the Heads-Up Display.
 *
 * Shows:
 * - Which mode you're in ("bazooka" / "commando" / ...)
 * - TODO: how many players are left alive
 * - TODO: your health bar
 */
export default function draw(props: HudProps) {
  drawHud({
    mode: props.mode,
    health: props.health,
    numPlayersLeft: props.numPlayersLeft,
    gameStatus: props.gameStatus,
    bazookaJuice: props.bazookaJuice,
  })
}

var drawHud = env.regl<{}, {}, HudProps>({
  vert: shaders.vert.uvClip,
  frag: shaders.frag.texture,
  attributes: {
    aPosition: function(context: DefaultContext, props: HudProps) {
      var rects = [] as number[][][]

      // Single px, x and y, in clip coordinates (which go from bottom left (-1, -1) to top right (1, 1))
      var pxW = 2 / context.viewportWidth
      var pxH = 2 / context.viewportHeight

      // Rect 1: left status
      rects.push(
        makeQuad(-1 + pxW * 16, -1 + pxH * (16 + STATUS_HEIGHT_PX), -1 + pxW * (16 + STATUS_WIDTH_PX), -1 + pxH * 16)
      )

      // Rect 2: health bar
      var healthX = pxW * (HEALTH_WIDTH_PX * -0.5 + 15 + props.health * 5)
      rects.push(makeQuad(pxW * HEALTH_WIDTH_PX * -0.5, -1 + pxH * (24 + HEALTH_HEIGHT_PX), healthX, -1 + pxH * 24))

      // Rect 3: health bar consumed
      rects.push(makeQuad(healthX, -1 + pxH * (24 + HEALTH_HEIGHT_PX), pxW * HEALTH_WIDTH_PX * 0.5, -1 + pxH * 24))

      // Rect 4: num players left alive
      rects.push(
        makeQuad(1 - pxW * (16 + NUM_LEFT_WIDTH_PX), -1 + pxH * (16 + NUM_LEFT_HEIGHT_PX), 1 - pxW * 16, -1 + pxH * 16)
      )

      // Rect 5 and 6: digits
      var pxFromBottom = 16 + NUM_LEFT_HEIGHT_PX - 20
      var pxCharHeight = 24
      var pxFromLeft = 16 + NUM_LEFT_WIDTH_PX - 24
      var pxCharWidth = (pxCharHeight * 4) / 6
      var pxCharSpace = 4
      rects.push(
        makeQuad(
          1 - pxW * pxFromLeft,
          -1 + pxH * pxFromBottom,
          1 - pxW * (pxFromLeft - pxCharWidth),
          -1 + pxH * (pxFromBottom - pxCharHeight)
        )
      )
      rects.push(
        makeQuad(
          1 - pxW * (pxFromLeft - pxCharWidth - pxCharSpace),
          -1 + pxH * pxFromBottom,
          1 - pxW * (pxFromLeft - 2 * pxCharWidth - pxCharSpace),
          -1 + pxH * (pxFromBottom - pxCharHeight)
        )
      )

      // Rect 7: victory
      // Texel: (72, 14) to (126, 48), 54 x 34
      const win = props.gameStatus === GameStatus.COMPLETED && props.health > 0 ? 2 : 0
      rects.push(makeQuad(pxW * -54 * win, pxH * 34 * win, pxW * 54 * win, pxH * -34 * win))

      // Rect 8: bazooka juice
      const bj = props.bazookaJuice
      var bjX0 = HEALTH_WIDTH_PX * -0.5 + 25
      var bjX1 = HEALTH_WIDTH_PX * -0.5 + 25 + bj * 5
      rects.push(
        makeQuad(pxW * bjX0, -1 + pxH * (24 + HEALTH_HEIGHT_PX + 8), pxW * bjX1, -1 + pxH * (24 + HEALTH_HEIGHT_PX + 4))
      )

      return rects
    },

    aUV: function(context: DefaultContext, props: HudProps) {
      var rects = [] as number[][][]

      // Each texel is 1/128 UV coords
      var tx = 1 / 128
      var ty = 1 / 128

      // Rect 1
      var voff = STATUS_OFFSETS[props.mode]
      if (voff == null) {
        throw new Error('Unsupported mode: ' + props.mode)
      }
      rects.push(makeQuad(tx * 4, voff * ty, tx * 70, ty * (voff + (32 * STATUS_HEIGHT_PX) / STATUS_WIDTH_PX)))

      // Rect 2: health bar
      var healthU = tx * (4 + 5 + props.health)
      rects.push(makeQuad(tx * 4, ty * 49, healthU, ty * 54))

      // Rect 3: health bar consumed
      rects.push(makeQuad(healthU, ty * 56, tx * 64, ty * 61))

      // Rect 4: num players left alive
      rects.push(makeQuad(tx * 4, ty * 32, tx * 64, ty * 48))

      // Rect 5 and 6: digits
      var dig1 = (props.numPlayersLeft / 10) | 0
      if (dig1 == 0) {
        dig1 = 10 // Write eg "8", not "08"
      }
      var dig2 = props.numPlayersLeft % 10
      rects.push(makeQuad(tx * (5 * dig1 + 72), ty * 4, tx * (5 * dig1 + 76), ty * 10))
      rects.push(makeQuad(tx * (5 * dig2 + 72), ty * 4, tx * (5 * dig2 + 76), ty * 10))

      // Rect 7: victory
      // Texel: (72, 14) to (126, 48), 54 x 34
      rects.push(makeQuad(tx * 72, ty * 14, tx * 126, ty * 48))

      // Rect 8: bazooka juice
      rects.push(makeQuad(tx * 72, ty * 12, tx * 73, ty * 13))

      return rects
    },
  },
  uniforms: {
    uTexture: function(context: DefaultContext, props: HudProps) {
      return textures.loaded.hud
    },
  },
  depth: {
    enable: false,
  },
  blend: {
    enable: false,
  },
  count: 6 * 8,
  primitive: 'triangles',
})

function makeQuad(x0: number, y0: number, x1: number, y1: number) {
  return [[x0, y0], [x0, y1], [x1, y1], [x0, y0], [x1, y1], [x1, y0]]
}
