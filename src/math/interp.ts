// Array linear interpolation
// Sets the values in arr to those in arr0 if u is 0, or arr1 if u is 1
export function tween(arr: Float32Array, arr0: Float32Array, arr1: Float32Array, u: number) {
  var n = arr.length
  if (arr0.length !== n || arr1.length !== n) {
    throw new Error('tween() expects three equal length arrays')
  }
  for (var i = 0; i < n; i++) {
    arr[i] = u * arr1[i] + (1 - u) * arr0[i]
  }
}

// 2D Cosine interpolation
// Takes four corner samples and a (u, v) inside the rectangle.
// Returns an interpolated value.
export function cosine2D(v00: number, v01: number, v10: number, v11: number, u: number, v: number) {
  if (u < 0 || u >= 1 || v < 0 || v >= 1) {
    throw new Error('cosine interpolation expects (u, v) in the range [0, 1)')
  }
  var utween = 0.5 - 0.5 * Math.cos(u * Math.PI)
  var vtween = 0.5 - 0.5 * Math.cos(v * Math.PI)
  return (
    v00 * (1 - utween) * (1 - vtween) +
    v01 * (1 - utween) * vtween +
    v10 * utween * (1 - vtween) +
    v11 * utween * vtween
  )
}
