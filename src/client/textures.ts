import env from './env'
import config from '../config'
import { Texture } from 'regl'

const loaded: { [key: string]: Texture } = {}

export default {
  load,
  loadAll,
  loaded,
}

// Loads all built-in textures, then calls back
function loadAll(cb: any) {
  var tex: { [key: string]: Promise<Texture> } = {
    atlas: load('textures/atlas-p9.png'),
    skinArmy: load('textures/skin-army.png'),
    skinCommando: load('textures/skin-commando.png'),
    hud: load('textures/hud.png'),
  }

  var keys = Object.keys(tex)
  var promises = keys.map(function(key) {
    return tex[key]
  })

  Promise.all(promises)
    .then(function(textures) {
      keys.forEach(function(key, i) {
        loaded[key] = textures[i]
      })
      cb()
    })
    .catch(function(err) {
      cb(err)
    })
}

// Returns a Promise that resolves to a REGL texture object
function load(url: string): Promise<Texture> {
  var aniso = Math.min(env.regl.limits.maxAnisotropic, config.GRAPHICS.MAX_ANISOTROPIC)

  return new Promise(function(resolve, reject) {
    var image = new Image()
    image.src = url
    image.onload = function() {
      console.log('Loaded ' + url)
      var tex = env.regl.texture({
        min: 'nearest',
        aniso: aniso,
        mag: 'nearest',
        data: image,
      })
      resolve(tex)
    }
    image.onerror = function() {
      reject(new Error('failed to load' + url))
    }
  })
}
