attribute vec3 aPosition;

uniform mat4 uMatrix;
uniform vec3 uCameraLoc;

varying vec4 vColor;

// aPosition in world coordinates.
// uMatrix is a combined projection * view matrix, so it transforms to clip coordinates.
void main(void) {
  vec4 pos = uMatrix * vec4(aPosition + uCameraLoc, 1.0);
  gl_Position = pos;
  
  vec3 colTop = vec3(169.0 / 255.0, 235.0 / 255.0, 255.0 / 255.0);
  vec3 colBot = vec3(255.0 / 255.0, 172.0 / 255.0, 186.0 / 255.0);
  vColor = vec4(mix(colTop, colBot, aPosition.z * 0.5 + 0.5), 1.0);
}
