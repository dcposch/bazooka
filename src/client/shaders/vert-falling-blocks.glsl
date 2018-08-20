precision mediump float;

uniform mat4 uMatrix;

attribute vec3 aPosition;
attribute vec3 aNormal;
// attribute vec2 aUV;

varying vec3 vNormal;
// varying vec2 vUV;
varying vec4 vColor;

// Inputs: positions in world coordinates, a projection * view matrix, and colors.
// Outputs: projected (screen space) vertices with colors.
void main(void) {
  // TODO:
  gl_Position = uMatrix * vec4(aPosition, 1.0);
  vNormal = aNormal;
  vColor = vec4(0.5, 0.5, 0.25, 1.0);
}
