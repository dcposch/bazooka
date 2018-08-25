import { Vec3 } from 'regl'
import Chunk from './chunk'
import World from './world'
import Socket from './client/socket'
import FallingBlock from './client/models/falling-block'
import GameObj from './client/models/game-obj'

export interface VecXYZ {
  x: number
  y: number
  z: number
}

export interface DirAzAlt {
  azimuth: number
  altitude: number
}

export enum PlayerMode {
  BAZOOKA = 'bazooka',
  COMMANDO = 'commando',
}

export enum CameraMode {
  FIRST_PERSON = 'first-person',
  THIRD_PERSON = 'third-person',
}

export enum PlayerSituation {
  ON_GROUND = 'on-ground',
  AIRBORNE = 'airborne',
  SUFFOCATING = 'suffocating',
}

/**
 * Primitive "bone" for rotating some part of a mesh around a point.
 */
export interface Bone {
  rot: Vec3
  center: Vec3
}

/**
 * Axis-aligned bounding box
 */
export interface AABB {
  x0: number
  y0: number
  z0: number
  x1: number
  y1: number
  z1: number
}

/** DEPRECATED. Will replace with GameObjPlayer */
export interface GamePlayerState {
  location: VecXYZ
  direction: DirAzAlt
  velocity: VecXYZ
  situation: PlayerSituation
  lookAtBlock:
    | {
        location: VecXYZ
        side: VecXYZ
        voxel: number
      }
    | undefined
  camera: CameraMode
  mode: PlayerMode
  name?: string
}

export interface GameState {
  startTime: number
  paused: boolean
  player: GamePlayerState
  cameraLoc: Vec3

  pendingCommands: GameCmd[]
  pendingChunkUpdates: Chunk[]

  perf: {
    lastFrameTime: number
    fps: number
    draw: { chunks: number; verts: number }
  }

  debug: {
    showHUD: boolean
  }

  objects: { [key: string]: GameClientObj }
  fallingBlocks: FallingBlock[]

  world: World
  socket: Socket
  config: ClientConfig
  error: Error | undefined
}

export interface GameClientObj extends GameObj {
  draw: () => void
  tick: (dt: number) => void
  destroy: () => void
}

/*export interface GameObjFallingBlock extends GameObj {
  rotAxis: Vec3
  rotTheta: number
  rotVel: number
  typeIndex: number
}

export interface GameObjPlayer extends GameObj {
  name: string
  direction: DirAzAlt
  situation: PlayerSituation
  mode: PlayerMode
}*/

export interface GameCmd {
  type: string
}

export interface GameCmdHandshake extends GameCmd {
  type: 'handshake'
  clientVersion: number
}

export interface GameCmdSetVox extends GameCmd {
  type: 'set'
  x: number
  y: number
  z: number
  v: number
}

export interface GameMsg {
  type: string
}

export interface GameMsgConfig extends GameMsg {
  type: 'config'
  config: ClientConfig
}

export interface GameMsgObjects extends GameMsg {
  type: 'objects'
  objects: GameObj[]
}

export type ClientConfig = any
