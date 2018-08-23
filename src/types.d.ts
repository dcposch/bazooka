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
