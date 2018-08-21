precision mediump float;

uniform mat4 uMatrix;
uniform vec3 uLightDir;
uniform vec3 uLightDiffuse;
uniform vec3 uLightAmbient;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUV;

varying vec2 vUV;
varying vec3 vLight;

// Inputs: positions in world coordinates, a projection * view matrix, and colors.
// Outputs: projected (screen space) vertices with colors.
void main(void) {
  gl_Position = uMatrix * vec4(aPosition, 1.0); 

  float diffuse = max(0.0, dot(aNormal, uLightDir));
  vLight = diffuse * uLightDiffuse + uLightAmbient;
}
