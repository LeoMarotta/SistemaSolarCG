"use strict";

// Usando o módulo de matrizes do TWGL
const m4 = twgl.m4;

// Setup do WebGL2
const canvas = document.querySelector("#glcanvas");
const gl = canvas.getContext("webgl2");

// Shaders atualizados para a sintaxe do WebGL2
const vs = `
  #version 300 es
  
  in vec4 position; // 'in' em vez de 'attribute'

  uniform mat4 u_worldViewProjection;

  void main() {
    gl_Position = u_worldViewProjection * position;
  }
`;

const fs = `
  #version 300 es
  precision mediump float;

  uniform vec4 u_color;

  out vec4 outColor; // 'out' em vez de 'gl_FragColor'

  void main() {
    outColor = u_color;
  }
`;

// -- O restante do seu código, que está muito bem estruturado --

const programInfo = twgl.createProgramInfo(gl, [vs, fs]);
const sphereBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 1, 24, 12);

// Factory para criar nós na cena
function createNode(drawInfo) {
  return {
    localMatrix: m4.identity(),
    worldMatrix: m4.identity(),
    children: [],
    drawInfo: drawInfo,
  };
}

// Atualiza recursivamente as matrizes dos nós
function updateWorldMatrix(node, parentWorldMatrix) {
  if (parentWorldMatrix) {
    m4.multiply(parentWorldMatrix, node.localMatrix, node.worldMatrix);
  } else {
    m4.copy(node.localMatrix, node.worldMatrix);
  }
  node.children.forEach(child => updateWorldMatrix(child, node.worldMatrix));
}

// Informações de desenho para cada objeto
const sunDrawInfo = { uniforms: { u_color: [1, 0.8, 0.2, 1] } };
const earthDrawInfo = { uniforms: { u_color: [0.2, 0.5, 1, 1] } };
const moonDrawInfo = { uniforms: { u_color: [0.7, 0.7, 0.7, 1] } };

// Atribuindo o programa e o buffer a cada objeto
[sunDrawInfo, earthDrawInfo, moonDrawInfo].forEach(info => {
  info.programInfo = programInfo;
  info.bufferInfo = sphereBufferInfo;
});

// Criando os nós da cena
const sunNode = createNode(sunDrawInfo);
const earthOrbitNode = createNode();
const earthNode = createNode(earthDrawInfo);
const moonOrbitNode = createNode();
const moonNode = createNode(moonDrawInfo);

// Montando a hierarquia (gráfico de cena)
sunNode.children.push(earthOrbitNode);
earthOrbitNode.children.push(earthNode);
earthNode.children.push(moonOrbitNode);
moonOrbitNode.children.push(moonNode);

// Configuração da câmera e projeção
const fov = 60 * Math.PI / 180;
const aspect = canvas.clientWidth / canvas.clientHeight;
const zNear = 0.1;
const zFar = 200; // Aumentado para garantir que tudo seja visível
const projection = m4.perspective(fov, aspect, zNear, zFar);
const camera = m4.lookAt([0, 10, 25], [0, 0, 0], [0, 1, 0]); // Câmera um pouco mais afastada e elevada
const view = m4.inverse(camera);
const viewProjection = m4.multiply(projection, view);

// Inicia o loop de renderização
requestAnimationFrame(drawScene);

function drawScene(time) {
  time *= 0.001; // ms para segundos

  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Atualiza as matrizes locais para animação
  sunNode.localMatrix = m4.rotationY(time * 0.1);
  earthOrbitNode.localMatrix = m4.rotationY(time * 0.2);
  m4.translate(earthOrbitNode.localMatrix, [10, 0, 0], earthOrbitNode.localMatrix);
  earthNode.localMatrix = m4.rotationY(time * 2);
  moonOrbitNode.localMatrix = m4.rotationY(time * 1.5);
  m4.translate(moonOrbitNode.localMatrix, [2, 0, 0], moonOrbitNode.localMatrix);
  moonNode.localMatrix = m4.rotationY(time * -3);

  // Atualiza todas as matrizes globais
  updateWorldMatrix(sunNode, null);

  // Coleta todos os objetos desenháveis da cena
  const drawInfos = [];
  function gatherDrawInfo(node) {
    if (node.drawInfo) {
      node.drawInfo.node = node;
      drawInfos.push(node.drawInfo);
    }
    node.children.forEach(gatherDrawInfo);
  }
  gatherDrawInfo(sunNode);

  // Desenha cada objeto
  drawInfos.forEach(info => {
    const { programInfo, bufferInfo, uniforms, node } = info;
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    const uni = {
      ...uniforms,
      u_worldViewProjection: m4.multiply(viewProjection, node.worldMatrix),
    };
    twgl.setUniforms(programInfo, uni);
    twgl.drawBufferInfo(gl, bufferInfo);
  });

  requestAnimationFrame(drawScene);
}