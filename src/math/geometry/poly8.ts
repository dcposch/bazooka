import Mesh from './mesh'
import vec3 from 'gl-vec3'
import vec2 from 'gl-vec2'
import { Vec3, Vec2 } from 'regl'
import { AABB } from '../../types'

// Each face consists of two triangles
var FACE = [[0, 0], [0, 1], [1, 0], [1, 0], [0, 1], [1, 1]]

// Represents an 8-point polyhedron
export default class Poly8 {
  verts: Vec3[]
  uvs: Vec2[]
  aabb: AABB

  constructor(verts: Vec3[], uvs: Vec2[]) {
    this.verts = verts
    this.uvs = uvs
    this.aabb = computeAABB(verts)
  }

  // Tests for intersection with a line segment
  intersect(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
    var b = this.aabb // axis aligned bounding box
    return (
      Math.max(x0, b.x0) <= Math.min(x1, b.x1) &&
      Math.max(y0, b.y0) <= Math.min(y1, b.y1) &&
      Math.max(z0, b.z0) <= Math.min(z1, b.z1)
    )
  }

  // Creates a mesh with six quads, two triangles each, like the six faces of a cube
  createMesh() {
    var mesh = new Mesh()

    // Create six faces...
    for (var i = 0; i < 6; i++) {
      var nx = i >> 1 === 0 ? (i % 2) * 2 - 1 : 0
      var ny = i >> 1 === 1 ? (i % 2) * 2 - 1 : 0
      var nz = i >> 1 === 2 ? (i % 2) * 2 - 1 : 0
      var faceUVs = this.uvs ? this.uvs[i] : null

      // ...each with two tris, six verts
      for (var j = 0; j < 6; j++) {
        var vi = FACE[j] // `vi` is one of [0, 0], [0, 1], [1, 0], or [1, 1]

        var ix = i >> 1 === 0 ? i % 2 : vi[0]
        var iy = i >> 1 === 1 ? i % 2 : vi[i >> 2]
        var iz = i >> 1 === 2 ? i % 2 : vi[1]
        var vert = this.verts[ix * 4 + iy * 2 + iz]
        mesh.verts.push(vec3.clone(vert))

        mesh.norms.push(vec3.clone([nx, ny, nz]))

        var uv = faceUVs ? faceUVs[vi[0] * 2 + vi[1]] : vi
        mesh.uvs.push(vec2.clone(uv))
      }
    }

    return mesh
  }

  // Creates an axis-aligned cuboid from p0 to p1
  // Optionally takes a list of 6 texture UVs arrays for the six faces (x0, x1, y0, y1, z0, z1)
  axisAligned(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, uvs: Vec2[]) {
    return new Poly8(
      [[x0, y0, z0], [x0, y0, z1], [x0, y1, z0], [x0, y1, z1], [x1, y0, z0], [x1, y0, z1], [x1, y1, z0], [x1, y1, z1]],
      uvs
    )
  }
}

// Finds the axis-aligned bounding box of a set of vertices
function computeAABB(verts: Vec3[]): AABB {
  var aabb = {
    x0: Infinity,
    y0: Infinity,
    z0: Infinity,
    x1: -Infinity,
    y1: -Infinity,
    z1: -Infinity,
  }
  verts.forEach(function(v) {
    aabb.x0 = Math.min(aabb.x0, v[0])
    aabb.y0 = Math.min(aabb.y0, v[1])
    aabb.z0 = Math.min(aabb.z0, v[2])
    aabb.x1 = Math.max(aabb.x1, v[0])
    aabb.y1 = Math.max(aabb.y1, v[1])
    aabb.z1 = Math.max(aabb.z1, v[2])
  })
  return aabb
}
