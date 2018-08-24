// If a triangle contains NaN somewhere, webgl will silently not render it.
// Make sure we don't create any of those.
// Check that `points` is an array of arrays of valid numbers (no NaN or Inf).
// Optionally make sure each point has `dim` coords or that there are `len` points.
export default function validate(points: number[][], dim?: number, len?: number) {
  if (len && points.length !== len) {
    throw new Error('expected ' + len + ' points')
  }
  points.forEach(function(point: number[]) {
    if (dim && point.length !== dim) {
      throw new Error('expected ' + dim + ' coords per point')
    }
    point.forEach(function(v: number) {
      if (!(v > -Infinity && v < Infinity)) {
        throw new Error('point not finite: ' + point.join(', '))
      }
    })
  })
}
