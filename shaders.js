const sunVs = `#version 300 es
  in vec4 position; in vec2 texcoord; 
  uniform mat4 u_worldViewProjection; 
  uniform mat4 u_world; 
  out vec3 v_worldPosition; 
  out vec2 v_texcoord;
  void main() { gl_Position = u_worldViewProjection * position; v_worldPosition = (u_world * position).xyz; v_texcoord = texcoord; }`;
// In const sunFs
const sunFs = `#version 300 es
  precision highp float; 
  in vec3 v_worldPosition; 
  in vec2 v_texcoord; 
  uniform float u_time; 
  uniform sampler2D u_texture; 
  uniform vec3 u_viewWorldPosition; // <-- ADD THIS UNIFORM
  out vec4 outColor;
  vec3 h(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return-1.+2.*fract(sin(p)*43758.5453123);}
  float n(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(dot(h(i),f),dot(h(i+vec3(1,0,0)),f-vec3(1,0,0)),f.x),mix(dot(h(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(h(i+vec3(1,1,0)),f-vec3(1,1,0)),f.x),f.y),mix(mix(dot(h(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(h(i+vec3(1,0,1)),f-vec3(1,0,1)),f.x),mix(dot(h(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(h(i+vec3(1,1,1)),f-vec3(1,1,1)),f.x),f.y),f.z);}
  float f(vec3 p){float v=.0;float a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.;a*=.5;}return v;}
  void main() {
    vec3 b=texture(u_texture,vec2(v_texcoord.x,1.-v_texcoord.y)).rgb; vec3 a=v_worldPosition*.5+vec3(u_time*.05); float c=f(a); vec3 d=mix(vec3(1,.5,.2),vec3(1,.8,.2),c); vec3 e=b*d;
    
    // --- CORRECTED RIM LIGHTING ---
    vec3 normal = normalize(v_worldPosition);
    vec3 viewVec = normalize(u_viewWorldPosition - v_worldPosition);
    float rim = 1.0 - dot(normal, viewVec);
    rim = pow(rim, 3.0); // Power enhances the effect
    vec3 k = vec3(1.0, 0.6, 0.1);
    e = mix(e, k, rim);

    outColor=vec4(e,1.);
  }`;

const planetVs = `#version 300 es
  in vec4 position; 
  in vec3 normal; 
  in vec2 texcoord; 
  uniform mat4 u_worldViewProjection; 
  uniform mat4 u_world; 
  out vec3 v_normal; 
  out vec3 v_worldPosition; 
  out vec2 v_texcoord;
  void main() { gl_Position = u_worldViewProjection * position; v_worldPosition = (u_world * position).xyz; v_normal = mat3(u_world) * normal; v_texcoord = texcoord; }`;
const planetFs = `#version 300 es
  precision mediump float; 
  in vec3 v_normal; 
  in vec3 v_worldPosition; 
  in vec2 v_texcoord; 
  uniform sampler2D u_texture; 
  uniform vec3 u_lightPosition; 
  out vec4 outColor;
  void main() { vec3 a=texture(u_texture,vec2(v_texcoord.x,1.-v_texcoord.y)).rgb; vec3 b=normalize(v_normal); vec3 c=normalize(u_lightPosition-v_worldPosition); float d=max(dot(b,c),0.); float e=.1; float f=e+d; vec3 g=a*f; outColor=vec4(g,1.); }`;

const lineVs = `#version 300 es
    in vec4 position; uniform mat4 u_matrix; void main() { gl_Position = u_matrix * position; }`;
const lineFs = `#version 300 es
    precision mediump float; uniform vec4 u_color; out vec4 outColor; void main() { outColor = u_color; }`;