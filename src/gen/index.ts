import perlin from '../math/perlin'
import vox from '../vox'
import config from '../config'
import Chunk from '../chunk'

// Generate the world
export default {
  generateColumn,
}

var CS = config.CHUNK_SIZE

var GEN_RAD = config.BAZOOKA.GEN_RADIUS_CHUNKS * CS

// Sample Perlin noise a few voxels around each chunk.
// That tells us if we need to eg. place leaves for a tree rooted in an adjacent chunk.
var PAD = 3
var PAD2 = 2 * PAD

// Allocate Perlin heightmaps once, re-use
var perlin1 = new Float32Array((CS + PAD2) * (CS + PAD2))
var perlin2 = new Float32Array((CS + PAD2) * (CS + PAD2))
var perlin3 = new Float32Array(CS * CS)

// World generation. Generates one (x, y) column of chunks.
// Returns a newly allocated Chunk: { x, y, z, data: UInt8Array }
// Skips {data} if the chunk would be completely empty
function generateColumn(x: number, y: number) {
  // Generate a Perlin heightmap
  // https://web.archive.org/web/20160421115558/
  // http://freespace.virgin.net/hugo.elias/models/m_perlin.htm
  var perlinGroundAmplitudes = [0, 0, 0, 0, 5, 0, 10, 0, 100]
  var perlinLayer2Amplitudes = [0, 5, 0, 0, 0, 10]
  var perlinLayer3Amplitudes = [0, 0, 0, 5, 0, 10]
  perlin.generate2D(perlin1, x - PAD, y - PAD, CS + PAD2, perlinGroundAmplitudes)
  perlin.generate2D(perlin2, x - PAD, y - PAD, CS + PAD2, perlinLayer2Amplitudes)
  perlin.generate2D(perlin3, x, y, CS, perlinLayer3Amplitudes)

  // Sky island: force positive near (0,0), clamp to zero toward (+/-1k, +/-1k)
  perlin.apply(perlin1, x - PAD, y - PAD, CS + PAD2, islandFunc)

  const ret = {
    chunks: [] as Chunk[],
    heightMap: new Float32Array(perlin1),
  }

  for (var z = -CS * 5; z < CS * 5; z += CS) {
    var chunk = new Chunk(x, y, z)
    placeLand(chunk)
    placeTrees(chunk)
    // Go from flat array of voxels to list-of-quads, save 90+% space
    ret.chunks.push(chunk.pack())
  }

  return ret
}

function islandFunc(sx, sy, val) {
  const island = val - (GEN_RAD - Math.sqrt(GEN_RAD * GEN_RAD - sx * sx - sy * sy)) * 0.1
  return Math.max(island, 0)
}

function placeLand(ret) {
  var z = ret.z
  for (var ix = 0; ix < CS; ix++) {
    for (var iy = 0; iy < CS; iy++) {
      var height1 = perlin1[(ix + PAD) * (CS + PAD2) + iy + PAD]
      var height2 = perlin2[(ix + PAD) * (CS + PAD2) + iy + PAD]
      var height3 = perlin3[ix * CS + iy]

      // Place earth
      for (var iz = 0; iz < CS; iz++) {
        var voxz = z + iz
        var voxtype
        if (voxz < height1 && voxz > 40.0 + height2) {
          voxtype = vox.INDEX.STONE
        } else if (voxz < height1 && voxz > 20.0 + height3) {
          voxtype = vox.INDEX.GRASS
        } else if (voxz < height1 && voxz > -height1) {
          voxtype = vox.INDEX.DARK_PURPLE
        } else {
          voxtype = vox.INDEX.AIR
        }
        ret.setVox(ix, iy, iz, voxtype)
      }
    }
  }
}

function placeTrees(ret) {
  var z = ret.z
  for (var ix = -2; ix < CS + PAD; ix++) {
    for (var iy = -2; iy < CS + PAD; iy++) {
      var h1 = perlin1[(ix + PAD) * (CS + PAD2) + iy + PAD]
      var h2 = perlin2[(ix + PAD) * (CS + PAD2) + iy + PAD]
      var i1 = Math.ceil(h1)
      var isShore = i1 >= 15 && i1 <= 18
      var palmJuice = h2 > 14.0 || h2 < 10.0 ? 2.0 : (h2 % 1.0) * 50.0 // range [0, 50)
      if (!isShore || palmJuice > 1.0) continue
      // If we're here, we're placing a palm tree, and palmJuice is in [0, 1)
      var palmHeight = Math.floor(palmJuice * 10.0) + 4
      if (i1 >= z + CS || i1 + palmHeight < z) continue
      for (var iz = i1 - z; iz < i1 + palmHeight - z; iz++) {
        // First, place the leaves
        var crown = i1 + palmHeight - z - iz - 1
        var setLeaf = false
        if (crown <= 2) {
          for (var jx = -3; jx <= 3; jx++) {
            for (var jy = -3; jy <= 3; jy++) {
              if (ix + jx < 0 || ix + jx >= CS || iy + jy < 0 || iy + jy >= CS) continue
              var h2J = perlin2[(ix + jx + PAD) * (CS + PAD2) + iy + jy + PAD]
              var palmJuiceJ = h2J % 1.0
              var leafJuice = Math.abs(Math.abs(jx) + Math.abs(jy) - crown)
              if (leafJuice > palmJuiceJ + 0.5) continue
              var leafType = Math.max(0, Math.min(2, crown - leafJuice))
              var voxtype = [vox.INDEX.PLANT_1, vox.INDEX.PLANT_2, vox.INDEX.PLANT_3][leafType]
              setLeaf = setLeaf || (jx === 0 && jy === 0)
              trySet(ret, ix + jx, iy + jy, iz, voxtype)
            }
          }
        }
        // Then, place the trunk
        if (!setLeaf) trySet(ret, ix, iy, iz, vox.INDEX.STRIPE_WOOD, true)
      }
    }
  }
}

function trySet(chunk: Chunk, ix: number, iy: number, iz: number, v: number, overwrite?: boolean) {
  if (ix < 0 || iy < 0 || iz < 0 || ix >= CS || iy >= CS || iz >= CS) return
  if (!overwrite && chunk.getVox(ix, iy, iz) !== vox.INDEX.AIR) return
  chunk.setVox(ix, iy, iz, v)
}
