import { Vec3 } from 'regl'

export interface PointXYZ {
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

export enum PlayerSituation {
  ON_GROUND = 'on-ground',
  AIRBORNE = 'airborne',
  SUFFOCATING = 'suffocating',
}

export interface Bone {
  rot: Vec3
  center: Vec3
}

export interface AABB {}
