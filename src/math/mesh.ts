import validate from './validate'
import vec3 from 'gl-vec3'
import vec2 from 'gl-vec2'

import { Vec3, Mat4, Mat3, Vec2 } from 'regl'

// Represents an mesh: vertices, normals and texture UVs
// Format:
// - verts is an array of vec3s, which are just Float32Arrays of length 3
// - norms is an array of vec3s
// - uvs is an array of vec2s
export default class Mesh {
  verts: Vec3[]
  norms: Vec3[]
  uvs: Vec2[]
  parent?: Mesh
  offset: number

  constructor(verts?: Vec3[], norms?: Vec3[], uvs?: Vec2[]) {
    if (verts) validate(verts, 3)
    if (norms) validate(norms, 3)
    if (uvs) validate(uvs, 2)

    this.verts = verts || []
    this.norms = norms || []
    this.uvs = uvs || []
    this.parent = undefined
    this.offset = 0

    var n = this.verts.length
    if (n % 3 !== 0) throw new Error('triangle mesh, n must be a multiple of 3')
    if (n !== this.norms.length) throw new Error('mesh must have same # of verts and norms')
    if (n !== this.uvs.length) throw new Error('mesh must have same # of verts and uvs')
  }

  clone() {
    var verts = this.verts.map(vec3.clone) as Vec3[]
    var norms = this.norms.map(vec3.clone) as Vec3[]
    var uvs = this.uvs.map(vec2.clone) as Vec2[]
    return new Mesh(verts, norms, uvs)
  }

  static combine(meshes: Mesh[]) {
    var ret = new Mesh()
    meshes.forEach(function(mesh) {
      mesh.parent = ret
      mesh.offset = ret.verts.length
      Array.prototype.push.apply(ret.verts, mesh.verts)
      Array.prototype.push.apply(ret.norms, mesh.norms)
      Array.prototype.push.apply(ret.uvs, mesh.uvs)
    })
    return ret
  }

  // Transform (translate, rotate, scale) a mesh according to a matrix
  static transform(output: Mesh, input: Mesh, mat: Mat4, matNorm: Mat3) {
    if (output.verts.length !== input.verts.length) {
      throw new Error('transform input and output meshes must be the same size')
    }
    Mesh.transformPart(output, input, mat, matNorm, 0)
  }

  static transformPart(output: Mesh, input: Mesh, mat: Mat4, matNorm: Mat3, offset: number) {
    if (!output || !input || !mat || !matNorm) throw new Error('missing args')
    offset = offset || input.offset

    var n = input.verts.length
    if (offset + n > output.verts.length) throw new Error('transformed part out of range')

    for (var i = 0; i < n; i++) {
      var vertIn = input.verts[i]
      var vertOut = output.verts[i + offset]
      vec3.transformMat4(vertOut, vertIn, mat)

      // Rotate, but don't translate or scale the norms
      var normIn = input.norms[i]
      var normOut = output.norms[i + offset]
      vec3.transformMat3(normOut, normIn, matNorm)
    }
  }

  static copyPart(output: Mesh, input: Mesh, offset?: number) {
    if (!output || !input) throw new Error('missing args')
    offset = offset || input.offset

    var n = input.verts.length
    if (offset + n > output.verts.length) throw new Error('transformed part out of range')

    for (var i = 0; i < n; i++) {
      var vertIn = input.verts[i]
      var vertOut = output.verts[i + offset]
      vec3.copy(vertOut, vertIn)

      var normIn = input.norms[i]
      var normOut = output.norms[i + offset]
      vec3.copy(normOut, normIn)
    }
  }
}
