"use strict";

const m4 = twgl.m4;

const canvas = document.querySelector("#glcanvas");
const gl = canvas.getContext("webgl2");

// --- SHADERS PARA PLANETAS (sem alteração) ---
const planetVs = `
  #version 300 es
  in vec4 position;
  uniform mat4 u_worldViewProjection;
  void main() {
    gl_Position = u_worldViewProjection * position;
  }
`;

const planetFs = `
  #version 300 es
  precision mediump float;
  uniform vec4 u_color;
  out vec4 outColor;
  void main() {
    outColor = u_color;
  }
`;

// --- NOVOS SHADERS PARA O SOL ---
const sunVs = `
  #version 300 es
  in vec4 position;

  uniform mat4 u_worldViewProjection;
  uniform mat4 u_world;

  out vec3 v_worldPosition;

  void main() {
    gl_Position = u_worldViewProjection * position;
    v_worldPosition = (u_world * position).xyz;
  }
`;

const sunFs = `
  #version 300 es
  precision highp float;

  in vec3 v_worldPosition;
  uniform float u_time;
  out vec4 outColor;

  vec3 hash(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(
        mix(dot(hash(i + vec3(0, 0, 0)), f - vec3(0, 0, 0)),
            dot(hash(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), f.x),
        mix(dot(hash(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)),
            dot(hash(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), f.x),
        f.y),
      mix(
        mix(dot(hash(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)),
            dot(hash(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), f.x),
        mix(dot(hash(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)),
            dot(hash(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), f.x),
        f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 animated_pos = v_worldPosition * 0.2 + vec3(0.0, 0.0, u_time * 0.1);
    float n = fbm(animated_pos);
    n = (n + 1.0) * 0.5;

    vec3 color1 = vec3(1.0, 0.5, 0.0);
    vec3 color2 = vec3(0.8, 0.0, 0.0);
    vec3 finalColor = mix(color1, color2, n);

    outColor = vec4(finalColor, 1.0);
  }
`;

// --- PROGRAMAS E BUFFERS ---
const planetProgramInfo = twgl.createProgramInfo(gl, [planetVs, planetFs]);
const sunProgramInfo = twgl.createProgramInfo(gl, [sunVs, sunFs]);
const sphereBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 1, 32, 24);

// --- UTILIDADES DA CENA ---
function createNode(drawInfo) {
  return {
    localMatrix: m4.identity(),
    worldMatrix: m4.identity(),
    children: [],
    drawInfo: drawInfo
  };
}

function updateWorldMatrix(node, parentWorldMatrix) {
  if (parentWorldMatrix) {
    m4.multiply(parentWorldMatrix, node.localMatrix, node.worldMatrix);
  } else {
    m4.copy(node.localMatrix, node.worldMatrix);
  }
  node.children.forEach(child => updateWorldMatrix(child, node.worldMatrix));
}

function gatherDrawInfo(node, collection) {
  if (node.drawInfo) {
    node.drawInfo.node = node;
    collection.push(node.drawInfo);
  }
  node.children.forEach(child => gatherDrawInfo(child, collection));
}

// --- OBJETOS DA CENA ---
const sunDrawInfo = {
  programInfo: sunProgramInfo,
  bufferInfo: sphereBufferInfo,
  uniforms: {}
};

const earthDrawInfo = {
  programInfo: planetProgramInfo,
  bufferInfo: sphereBufferInfo,
  uniforms: { u_color: [0.2, 0.5, 1, 1] }
};

const moonDrawInfo = {
  programInfo: planetProgramInfo,
  bufferInfo: sphereBufferInfo,
  uniforms: { u_color: [0.7, 0.7, 0.7, 1] }
};

// --- HIERARQUIA DA CENA ---
const sunNode = createNode(sunDrawInfo);
const earthOrbitNode = createNode();
const earthNode = createNode(earthDrawInfo);
const moonOrbitNode = createNode();
const moonNode = createNode(moonDrawInfo);

sunNode.children.push(earthOrbitNode);
earthOrbitNode.children.push(earthNode);
earthNode.children.push(moonOrbitNode);
moonOrbitNode.children.push(moonNode);

// --- CÂMERA ---
const fov = 60 * Math.PI / 180;
const aspect = canvas.clientWidth / canvas.clientHeight;
const zNear = 0.1;
const zFar = 200;
const projection = m4.perspective(fov, aspect, zNear, zFar);
const camera = m4.lookAt([0, 10, 25], [0, 0, 0], [0, 1, 0]);
const view = m4.inverse(camera);
const viewProjection = m4.multiply(projection, view);

// --- LOOP DE RENDERIZAÇÃO ---
requestAnimationFrame(drawScene);

function drawScene(time) {
  time *= 0.001;

  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // --- ANIMAÇÕES ---
  sunNode.localMatrix = m4.rotationY(time * 0.1);
  earthOrbitNode.localMatrix = m4.rotationY(time * 0.2);
  m4.translate(earthOrbitNode.localMatrix, [10, 0, 0], earthOrbitNode.localMatrix);
  earthNode.localMatrix = m4.rotationY(time * 2);
  moonOrbitNode.localMatrix = m4.rotationY(time * 1.5);
  m4.translate(moonOrbitNode.localMatrix, [2, 0, 0], moonOrbitNode.localMatrix);
  moonNode.localMatrix = m4.rotationY(time * -3);

  updateWorldMatrix(sunNode, null);

  const drawInfos = [];
  gatherDrawInfo(sunNode, drawInfos);

  drawInfos.forEach(info => {
    const { programInfo, bufferInfo, uniforms, node } = info;
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

    const uni = {
      ...uniforms,
      u_worldViewProjection: m4.multiply(viewProjection, node.worldMatrix),
      u_world: node.worldMatrix,
      u_time: time
    };

    twgl.setUniforms(programInfo, uni);
    twgl.drawBufferInfo(gl, bufferInfo);
  });

  requestAnimationFrame(drawScene);
}
