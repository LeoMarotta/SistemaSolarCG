// Shader do Sol (com efeito de ruído animado)
const sunVs = `#version 300 es
  in vec4 position;
  uniform mat4 u_worldViewProjection;
  uniform mat4 u_world;
  out vec3 v_worldPosition;
  void main() {
    gl_Position = u_worldViewProjection * position;
    v_worldPosition = (u_world * position).xyz;
  }`;

const sunFs = `#version 300 es
  precision highp float;
  in vec3 v_worldPosition;
  uniform float u_time;
  out vec4 outColor;

  // Funções de ruído para criar o efeito de "lava"
  vec3 hash(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return-1.+2.*fract(sin(p)*43758.5453123);}
  float noise(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(dot(hash(i+vec3(0,0,0)),f-vec3(0,0,0)),dot(hash(i+vec3(1,0,0)),f-vec3(1,0,0)),f.x),mix(dot(hash(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash(i+vec3(1,1,0)),f-vec3(1,1,0)),f.x),f.y),mix(mix(dot(hash(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash(i+vec3(1,0,1)),f-vec3(1,0,1)),f.x),mix(dot(hash(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash(i+vec3(1,1,1)),f-vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float v=.0;float a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.;a*=.5;}return v;}

  void main() {
    vec3 animated_pos = v_worldPosition * 0.2 + vec3(0.0, 0.0, u_time * 0.1);
    float n = fbm(animated_pos);
    n = (n + 1.0) * 0.5;
    vec3 color1 = vec3(1.0, 0.5, 0.0);
    vec3 color2 = vec3(0.8, 0.0, 0.0);
    vec3 finalColor = mix(color1, color2, n);
    outColor = vec4(finalColor, 1.0);
  }`;

// Shader para planetas e outros corpos (cor sólida)
const planetVs = `#version 300 es
  in vec4 position;
  uniform mat4 u_worldViewProjection;
  void main() {
    gl_Position = u_worldViewProjection * position;
  }`;

const planetFs = `#version 300 es
  precision mediump float;
  uniform vec4 u_color;
  out vec4 outColor;
  void main() {
    outColor = u_color;
  }`;

// Shader para desenhar as linhas das órbitas com cores individuais
const lineVs = `#version 300 es
    in vec4 position;
    uniform mat4 u_matrix;
    void main() {
        gl_Position = u_matrix * position;
    }`;

const lineFs = `#version 300 es
    precision mediump float;
    uniform vec4 u_color;
    out vec4 outColor;
    void main() {
        outColor = u_color; // Usar a cor passada como uniform
    }`;