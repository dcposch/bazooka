import { Vec3 } from 'regl'
import Chunk from './protocol/chunk'
import World from './protocol/world'
import Socket from './client/socket'
import GameObj from './protocol/obj/game-obj'

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

export enum ObjSituation {
  ON_GROUND = 'on-ground',
  AIRBORNE = 'airborne',
  IN_GROUND = 'in-ground',
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

export enum GameStatus {
  LOBBY = 'LOBBY',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

/** DEPRECATED. Will replace with GameObjPlayer */
export interface GamePlayerState {
  location: VecXYZ
  direction: DirAzAlt
  velocity: VecXYZ
  situation: ObjSituation
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

  gameStatus: GameStatus

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

  objects: { [key: string]: GameObj }

  world: World
  socket: Socket
  config: ClientConfig
  error: Error | undefined
  totalPlayers: number
  alivePlayers: number
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
  situation: ObjSituation
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
