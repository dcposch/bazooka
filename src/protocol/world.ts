import config from '../config'
import Chunk from './chunk'

var CB = config.CHUNK_BITS

// Keeps track of the world and everything in it
// Keeps a compact representation, and provides lookup and iteration.
// Does NOT do:
// - Projection or picking
// - Rendering
// - Change tracking
// - Serialization
class World {
  chunks: Array<Chunk> = []
  chunkTable: { [key: string]: Chunk } = {}
  constructor() {}

  // Adds a new chunk (cube of voxels) to the world
  // Should contain {x, y, z, data, mesh}
  addChunk(chunk: Chunk) {
    var key = chunk.x + ',' + chunk.y + ',' + chunk.z
    if (this.chunkTable[key]) throw new Error('there is already a chunk at ' + key)
    this.chunks.push(chunk)
    this.chunkTable[key] = chunk
  }

  // Adds a new chunk to the world
  // Same as addChunk, but replaces an existing chunk at the same location instead of throwing.
  replaceChunk(chunk: Chunk) {
    var key = chunk.x + ',' + chunk.y + ',' + chunk.z
    if (this.chunkTable[key]) {
      var index = this.findChunkIndex(chunk)
      this.chunks[index].destroy()
      this.chunks[index] = chunk
    } else {
      this.chunks.push(chunk)
    }
    this.chunkTable[key] = chunk
  }

  // Removes a chunk from the world.
  // Takes a chunk object or any object {x, y, z}
  removeChunk(chunk: Chunk) {
    var key = chunk.x + ',' + chunk.y + ',' + chunk.z
    if (!this.chunkTable[key]) throw new Error('there is no chunk at ' + key)
    var index = this.findChunkIndex(chunk)
    this.chunks[index].destroy()
    this.chunks.splice(index, 1)
    delete this.chunkTable[key]
  }

  findChunkIndex(chunk: Chunk) {
    for (var i = 0; i < this.chunks.length; i++) {
      var c = this.chunks[i]
      if (c.x === chunk.x && c.y === chunk.y && c.z === chunk.z) return i
    }
    throw new Error('chunk not found')
  }

  // Efficiently removes multiple chunks from the world, O(n) where n is total # of chunks.
  // Takes a predicate that returns whether a given chunk should be removed.
  removeChunks(predicate: (chunk: Chunk) => boolean) {
    var offset = 0
    for (var i = 0; i < this.chunks.length; i++) {
      var chunk = this.chunks[i]
      if (predicate(chunk)) {
        // Nuke `chunk`
        offset++
        var key = chunk.x + ',' + chunk.y + ',' + chunk.z
        delete this.chunkTable[key]
        chunk.destroy()
      } else if (offset > 0) {
        // Move `chunk` to the correct slot
        this.chunks[i - offset] = chunk
      }
    }
    if (offset > 0) this.chunks.length = this.chunks.length - offset
  }

  // Returns the chunk AT (x, y, z), not the chunk containing (x, y, z)
  // In other words, x, y, and z should all be multiples of CHUNK_SIZE
  // Returns undefined if that chunk doesn't exist
  getChunk(x: number, y: number, z: number) {
    var key = x + ',' + y + ',' + z
    return this.chunkTable[key]
  }

  // Returns the voxel at (x, y, z), or -1 if that chunk doesn't exist
  getVox(x: number, y: number, z: number): number {
    var cx = (x >> CB) << CB
    var cy = (y >> CB) << CB
    var cz = (z >> CB) << CB
    var chunk = this.getChunk(cx, cy, cz)
    if (!chunk) return -1
    return chunk.getVox(x - cx, y - cy, z - cz)
  }

  // Sets the voxel at (x, y, z), creating a new chunk if necessary
  setVox(x: number, y: number, z: number, v: number) {
    var cx = (x >> CB) << CB
    var cy = (y >> CB) << CB
    var cz = (z >> CB) << CB
    var chunk = this.getChunk(cx, cy, cz)
    if (!chunk) {
      chunk = new Chunk(cx, cy, cz)
      this.addChunk(chunk)
    }
    chunk.setVox(x - cx, y - cy, z - cz, v)
  }
}

export default World
