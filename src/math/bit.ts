export default function nextPow2(v: number) {
  v = (v | 0) - 1
  v |= v >> 1
  v |= v >> 2
  v |= v >> 4
  v |= v >> 8
  v |= v >> 16
  return v + 1
}
