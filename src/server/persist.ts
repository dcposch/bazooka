import fs from 'fs'
import ChunkIO from '../protocol/chunk-io'
import FlexBuffer from '../protocol/flex-buffer'

module.exports = {
  load: load,
  save: save
}

function load (path, world, cb) {
  console.log('Reading world from ' + path)
  fs.readFile(path, function (err, buf) {
    if (err) return cb(err)

    var chunks = ChunkIO.read(buf.buffer)
    console.log('Read %d chunks, %dmb from %s', chunks.length, Math.round(buf.length / 1e6), path)

    chunks.forEach(function (chunk) {
      world.addChunk(chunk)
    })

    cb()
  })
}

function save (path, world) {
  console.log('Saving world to ' + path)
  var fb = new FlexBuffer()
  ChunkIO.write(fb, world.chunks)
  fs.writeFile(path, fb.slice(), function (err) {
    if (err) return console.error(err)
    console.log('Saved %d chunks, %dmb to %s', world.chunks.length, Math.round(fb.n / 1e6), path)
  })
}
