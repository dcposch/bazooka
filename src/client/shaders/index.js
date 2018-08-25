import fs from 'fs'

// TODO: turn into .ts file once this Parcel bug is fixed:
// https://github.com/parcel-bundler/parcel/issues/1736
export default {
  vert: {
    uvWorld: fs.readFileSync(__dirname + '/vert-uv-world.glsl', 'utf8'),
    uvClip: fs.readFileSync(__dirname + '/vert-uv-clip.glsl', 'utf8'),
    colorWorld: fs.readFileSync(__dirname + '/vert-color-world.glsl', 'utf8'),
    colorClip: fs.readFileSync(__dirname + '/vert-color-clip.glsl', 'utf8'),
    fallingBlocks: fs.readFileSync(__dirname + '/vert-falling-blocks.glsl', 'utf8'),
    sky: fs.readFileSync(__dirname + '/vert-sky.glsl', 'utf8'),
  },
  frag: {
    color: fs.readFileSync(__dirname + '/frag-color.glsl', 'utf8'),
    texture: fs.readFileSync(__dirname + '/frag-texture.glsl', 'utf8'),
    textureLight: fs.readFileSync(__dirname + '/frag-texture-light.glsl', 'utf8'),
    voxel: fs.readFileSync(__dirname + '/frag-voxel.glsl', 'utf8'),
  },
}
