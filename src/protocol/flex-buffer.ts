import nextPow2 from '../math/bit'

// A buffer that resizes automatically.
// You can truncate it, append to it, then use slice() to get a Buffer.
class FlexBuffer {
  buf: Buffer
  n: number
  constructor() {
    this.buf = Buffer.alloc(1 << 20)
    this.n = 0
  }

  reset() {
    this.n = 0
  }

  writeInt32LE(v: number) {
    this.resize(4)
    this.buf.writeInt32LE(v, this.n)
    this.n += 4
  }

  writeUInt8(v: number) {
    this.resize(1)
    this.buf.writeUInt8(v, this.n)
    this.n++
  }

  writeUint8Array(arr: Uint8Array, start: number, len: number) {
    if (start) {
      var arrayBuf = arr.buffer // get the underlying ArrayBuffer
      arr = new Uint8Array(arrayBuf.slice(start, len))
    }
    this.resize(arr.length)
    this.buf.set(arr, this.n)
    this.n += len
  }

  slice() {
    return this.buf.slice(0, this.n)
  }

  resize(m: number) {
    var n = this.n
    if (n + m <= this.buf.length) return
    var newBuf = Buffer.alloc(nextPow2(n + m))
    newBuf.set(this.buf.slice(0, n))
    this.buf = newBuf
  }
}

export default FlexBuffer
