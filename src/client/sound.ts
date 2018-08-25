export default { play }

// Cache <audio> elements for instant playback
const cache: { [name: string]: HTMLAudioElement } = {}

// Preload any short sounds checked into the repo
const soundNames = [] // ['win95.mp3']
soundNames.forEach(function(name: string) {
  var audio = new Audio()
  audio.src = 'sounds/' + name
  cache[name] = audio
})

// Takes a name (for short sounds) or a URL (for larger files, not in git)
// Optionally takes a time offset in seconds
function play(name: string, time: number) {
  var audio = cache[name]
  if (!audio) {
    if (!name.includes('/')) throw new Error('Missing sound: ' + name)
    audio = new Audio()
    audio.src = name
    cache[name] = audio
  }
  audio.currentTime = time || 0
  audio.play()
}
