precision mediump float;

uniform sampler2D uTexture;

varying vec2 vUV;

void main(void) {
  vec4 tex = texture2D(uTexture, vUV);
  if (tex.w < 0.5) gl_FragColor = vec4(1, 0, 0, 1);
  else gl_FragColor = tex;
}
