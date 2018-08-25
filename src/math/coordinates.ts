import { vec3 } from 'gl-matrix'

// Takes spherical coordinates: azimuth, altitude, and radius
// Azimuth 0, altitude 0 points in the +X direction
// Azimuth PI/2 points in the +Y direction
// Altitude PI/2 points in the +Z direction (up)
// Returns a vec3 in cartesian coordinates
export function toCartesian(azimuth: number, altitude: number, radius: number) {
  var x = Math.cos(azimuth) * Math.cos(altitude) * radius
  var y = Math.sin(azimuth) * Math.cos(altitude) * radius
  var z = Math.sin(altitude) * radius
  return vec3.clone([x, y, z])
}
