"use strict";

function main() {
    const INITIAL_SIMULATION_DAY = 1000;
    const m4 = twgl.m4;
    const canvas = document.querySelector("#glcanvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL 2 não está disponível no seu navegador.");
        return;
    }

    const cameraState = {
        target: [0, 0, 0],
        radius: 200,
        minRadius: 100,
        maxRadius: 5000,
        rotationX: Math.PI / 3,
        rotationY: 0,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0,
    };

    const AU = 149.6e6; 
    
    const SCALES = {
        ORBIT: 4,
        ORBIT_LINE: 186,
        PLANET: 5000,
        SUN: 10000,
        MOON_ORBIT: 500,
        MOON: 7500,
        ORBIT_LINE_WIDTH: 0.2,
        MOON_ORBIT_LINE_WIDTH: 0.01,
    };

    const celestialData = {
        sol:      { radius: 696340, rotationPeriod: 27, textureUrl: 'textures/2k_sun.jpg' },
        mercurio: { radius: 2439.7, orbitRadius: 0.387 * AU, orbitalPeriod: 88.0, rotationPeriod: 58.6, textureUrl: 'textures/2k_mercury.jpg' },
        venus:    { radius: 6051.8, orbitRadius: 0.723 * AU, orbitalPeriod: 224.7, rotationPeriod: -243.0, textureUrl: 'textures/2k_venus_surface.jpg' },
        terra:    { radius: 6371, orbitRadius: 1 * AU, orbitalPeriod: 365.2, rotationPeriod: 1.0, textureUrl: 'textures/2k_earth_daymap.jpg', moons: { 
            lua: { radius: 1737.4, orbitRadius: 384400, orbitalPeriod: 27.3, textureUrl: 'textures/2k_moon.jpg' } } 
        },
        marte:    { radius: 3389.5, orbitRadius: 1.524 * AU, orbitalPeriod: 687.0, rotationPeriod: 1.03, textureUrl: 'textures/2k_mars.jpg' },
        ceres:    { radius: 476, orbitRadius: 2.766 * AU, orbitalPeriod: 1680, rotationPeriod: 0.37, textureUrl: 'textures/2k_moon.jpg' }, // Usando textura da lua para Ceres
        jupiter:  { radius: 69911, orbitRadius: 5.204 * AU, orbitalPeriod: 4332.6, rotationPeriod: 0.41, textureUrl: 'textures/2k_jupiter.jpg' },
        saturno:  { radius: 58232, orbitRadius: 9.582 * AU, orbitalPeriod: 10759.2, rotationPeriod: 0.44, textureUrl: 'textures/2k_saturn.jpg' },
        urano:    { radius: 25362, orbitRadius: 19.229 * AU, orbitalPeriod: 30688.5, rotationPeriod: -0.72, textureUrl: 'textures/2k_uranus.jpg' },
        netuno:   { radius: 24622, orbitRadius: 30.104 * AU, orbitalPeriod: 60182, rotationPeriod: 0.67, textureUrl: 'textures/2k_neptune.jpg' },
    };

    const textures = twgl.createTextures(gl, {
    sol:      { src: celestialData.sol.textureUrl, flipY: true },
    mercurio: { src: celestialData.mercurio.textureUrl, flipY: true },
    venus:    { src: celestialData.venus.textureUrl, flipY: true },
    terra:    { src: celestialData.terra.textureUrl, flipY: true },
    lua:      { src: celestialData.terra.moons.lua.textureUrl, flipY: true },
    marte:    { src: celestialData.marte.textureUrl, flipY: true },
    ceres:    { src: celestialData.ceres.textureUrl, flipY: true },
    jupiter:  { src: celestialData.jupiter.textureUrl, flipY: true },
    saturno:  { src: celestialData.saturno.textureUrl, flipY: true },
    urano:    { src: celestialData.urano.textureUrl, flipY: true },
    netuno:   { src: celestialData.netuno.textureUrl, flipY: true }
});

    const sunProgramInfo = twgl.createProgramInfo(gl, [sunVs, sunFs]);
    const planetProgramInfo = twgl.createProgramInfo(gl, [planetVs, planetFs]);
    const lineProgramInfo = twgl.createProgramInfo(gl, [lineVs, lineFs]);
    const sphereBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 1, 32, 24);
    const lightPosition = [0, 0, 0];
    const scene = { nodes: {}, drawables: [], orbits: [] };
    const simulation = { time: INITIAL_SIMULATION_DAY, speed: 1, isPlaying: true, lastTime: 0 };

    function createNode(name, drawInfo = null) {
        const node = { name, localMatrix: m4.identity(), worldMatrix: m4.identity(), children: [], drawInfo };
        scene.nodes[name] = node;
        if (drawInfo) {
            drawInfo.node = node;
            scene.drawables.push(drawInfo);
        }
        return node;
    }

    function createOrbitLine(orbitRadius, lineWidth) {
        const positions = [];
        const segments = 128;
        const halfWidth = lineWidth / 2.0;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            const cosAngle = Math.cos(angle);
            const sinAngle = Math.sin(angle);
            const x = cosAngle * orbitRadius;
            const z = sinAngle * orbitRadius;
            const dirX = cosAngle;
            const dirZ = sinAngle;
            positions.push(x + dirX * halfWidth, 0, z + dirZ * halfWidth);
            positions.push(x - dirX * halfWidth, 0, z - dirZ * halfWidth);
        }
        return twgl.createBufferInfoFromArrays(gl, { position: { numComponents: 3, data: positions } });
    }

    const sunNode = createNode("sol", { 
        programInfo: sunProgramInfo, 
        bufferInfo: sphereBufferInfo, 
        uniforms: { u_texture: textures.sol } 
    });
    
    for (const [name, data] of Object.entries(celestialData)) {
        if (name === 'sol') continue;
        
        const orbitNode = createNode(`${name}Orbit`);
        sunNode.children.push(orbitNode);
        
    const planetNode = createNode(name, { 
        programInfo: planetProgramInfo, 
        bufferInfo: sphereBufferInfo, 
        uniforms: { 
            u_texture: textures[name],
            u_lightPosition: lightPosition 
        } 
    });
        orbitNode.children.push(planetNode);
        
        const orbitRadius = (data.orbitRadius / AU) * SCALES.ORBIT_LINE;
        
        scene.orbits.push({
            bufferInfo: createOrbitLine(orbitRadius, SCALES.ORBIT_LINE_WIDTH),
            programInfo: lineProgramInfo,
            color: [0.5, 0.5, 0.5, 1.0], 
            planetName: name,
            orbitType: 'planet',
            orbitRadius: orbitRadius
        });
        
        if (data.moons) {
            for (const [moonName, moonData] of Object.entries(data.moons)) {
                const moonOrbitNode = createNode(`${moonName}Orbit`);
                planetNode.children.push(moonOrbitNode);
                const moonNode = createNode(moonName, { 
                    programInfo: planetProgramInfo, 
                    bufferInfo: sphereBufferInfo, 
                    uniforms: { 
                        u_texture: textures[moonName],
                        u_lightPosition: lightPosition 
                    }
                });
                moonOrbitNode.children.push(moonNode);
                const moonOrbitRadius = (moonData.orbitRadius / AU) * SCALES.MOON_ORBIT;
                scene.orbits.push({
                    bufferInfo: createOrbitLine(moonOrbitRadius, SCALES.MOON_ORBIT_LINE_WIDTH),
                    programInfo: lineProgramInfo,
                    color: [0.5, 0.5, 0.5, 1.0],
                    parentNode: planetNode,
                    orbitType: 'moon',
                    moonName: moonName,
                    planetName: name
                });
            }
        }
    }

    function updateWorldMatrix(node, parentWorldMatrix) {
        m4.copy(node.localMatrix, node.worldMatrix);
        if (parentWorldMatrix) {
            m4.multiply(parentWorldMatrix, node.worldMatrix, node.worldMatrix);
        }
        node.children.forEach(child => updateWorldMatrix(child, node.worldMatrix));
    }

    const fov = 60 * Math.PI / 180;
    const zNear = 0.01;
    const zFar = 300000;

    function render(time) {
        time *= 0.001;
        if (simulation.lastTime === 0) simulation.lastTime = time;
        let deltaTime = time - simulation.lastTime;
        simulation.lastTime = time;

        if (simulation.isPlaying) {
            simulation.time += deltaTime * simulation.speed;
        }

        const displayDay = simulation.time - INITIAL_SIMULATION_DAY;

        const dateLabel = document.getElementById('date-label');
        const speedLabel = document.getElementById('speed-label');
        if (dateLabel) dateLabel.textContent = `Dia: ${Math.floor(displayDay)}`;
        if (speedLabel) speedLabel.textContent = `Velocidade: ${simulation.speed}x`;

        const simTime = simulation.time;
        const sunData = celestialData.sol;
        
        m4.identity(scene.nodes.sol.localMatrix);
        m4.rotateY(scene.nodes.sol.localMatrix, (simTime / sunData.rotationPeriod) * 2 * Math.PI, scene.nodes.sol.localMatrix);
        m4.scale(scene.nodes.sol.localMatrix, Array(3).fill((sunData.radius / AU) * SCALES.SUN), scene.nodes.sol.localMatrix);
        
        for (const [name, data] of Object.entries(celestialData)) {
            if (name === 'sol') continue;
            
            const orbitRadius = (data.orbitRadius / AU) * SCALES.ORBIT;
            const orbitAngle = (simTime / data.orbitalPeriod) * 2 * Math.PI;
            const orbitNode = scene.nodes[`${name}Orbit`];
            
            m4.identity(orbitNode.localMatrix);
            m4.rotateY(orbitNode.localMatrix, orbitAngle, orbitNode.localMatrix);
            m4.translate(orbitNode.localMatrix, [orbitRadius, 0, 0], orbitNode.localMatrix);
            
            const planetNode = scene.nodes[name];
            const planetScale = (data.radius / AU) * SCALES.PLANET;
            m4.identity(planetNode.localMatrix);
            m4.rotateY(planetNode.localMatrix, (simTime / data.rotationPeriod) * 2 * Math.PI, planetNode.localMatrix);
            m4.scale(planetNode.localMatrix, [planetScale, planetScale, planetScale], planetNode.localMatrix);
            
            if (data.moons) {
                for (const [moonName, moonData] of Object.entries(data.moons)) {
                    const moonOrbitRadius = (moonData.orbitRadius / AU) * SCALES.MOON_ORBIT;
                    const moonOrbitAngle = (simTime / moonData.orbitalPeriod) * 2 * Math.PI;
                    const moonOrbitNode = scene.nodes[`${moonName}Orbit`];
                    
                    m4.identity(moonOrbitNode.localMatrix);
                    m4.rotateY(moonOrbitNode.localMatrix, moonOrbitAngle, moonOrbitNode.localMatrix);
                    m4.translate(moonOrbitNode.localMatrix, [moonOrbitRadius, 0, 0], moonOrbitNode.localMatrix);
                    
                    const moonNode = scene.nodes[moonName];
                    const moonScale = (moonData.radius / AU) * SCALES.MOON;
                    m4.identity(moonNode.localMatrix);
                    m4.scale(moonNode.localMatrix, [moonScale, moonScale, moonScale], moonNode.localMatrix);
                }
            }
        }
        
        updateWorldMatrix(sunNode);

        twgl.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projection = m4.perspective(fov, aspect, zNear, zFar);
        
        const cameraPosition = [
            Math.cos(cameraState.rotationY) * Math.sin(cameraState.rotationX) * cameraState.radius,
            Math.cos(cameraState.rotationX) * cameraState.radius,
            Math.sin(cameraState.rotationY) * Math.sin(cameraState.rotationX) * cameraState.radius
        ];
        const camera = m4.lookAt(cameraPosition, cameraState.target, [0, 1, 0]);
        const view = m4.inverse(camera);
        const viewProjection = m4.multiply(projection, view);

        gl.useProgram(lineProgramInfo.program);
        
        scene.orbits.forEach((orbit) => {
            twgl.setBuffersAndAttributes(gl, lineProgramInfo, orbit.bufferInfo);
            
            let orbitMatrix = viewProjection;
            if (orbit.orbitType === 'moon' && orbit.parentNode) {
                orbitMatrix = m4.multiply(viewProjection, orbit.parentNode.worldMatrix);
            }
            
            twgl.setUniforms(lineProgramInfo, { u_matrix: orbitMatrix, u_color: orbit.color });
            twgl.drawBufferInfo(gl, orbit.bufferInfo, gl.TRIANGLE_STRIP);
        });

        scene.drawables.forEach(drawable => {
            gl.useProgram(drawable.programInfo.program);
            twgl.setBuffersAndAttributes(gl, drawable.programInfo, drawable.bufferInfo);
            const worldViewProjection = m4.multiply(viewProjection, drawable.node.worldMatrix);
            twgl.setUniforms(drawable.programInfo, {
                ...drawable.uniforms,
                u_worldViewProjection: worldViewProjection,
                u_world: drawable.node.worldMatrix,
                u_time: time,
            });
            twgl.drawBufferInfo(gl, drawable.bufferInfo);
        });

        requestAnimationFrame(render);
    }

    canvas.addEventListener('mousedown', (e) => { cameraState.isDragging = true; cameraState.lastMouseX = e.clientX; cameraState.lastMouseY = e.clientY; });
    canvas.addEventListener('mouseup', () => { cameraState.isDragging = false; });
    canvas.addEventListener('mousemove', (e) => {
        if (!cameraState.isDragging) return;
        const deltaX = e.clientX - cameraState.lastMouseX;
        const deltaY = e.clientY - cameraState.lastMouseY;
        cameraState.rotationY += deltaX * 0.005;
        cameraState.rotationX += deltaY * 0.005;
        cameraState.rotationX = Math.max(0.1, Math.min(Math.PI - 0.1, cameraState.rotationX));
        cameraState.lastMouseX = e.clientX;
        cameraState.lastMouseY = e.clientY;
    });
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        cameraState.radius += e.deltaY * 1.5;
        cameraState.radius = Math.max(cameraState.minRadius, Math.min(cameraState.maxRadius, cameraState.radius));
    });

    const speedLevels = [-64, -32, -16, -8, -4, -2, -1, -0.5, 0.5, 1, 2, 4, 8, 16, 32, 64];
    let currentSpeedIndex = speedLevels.indexOf(1);
    simulation.speed = speedLevels[currentSpeedIndex];

    const playPauseButton = document.getElementById('play-pause-button');
    const forwardButton = document.getElementById('forward-button');
    const rewindButton = document.getElementById('rewind-button');
    const speedLabel = document.getElementById('speed-label');
    
    function updateSpeed() {
        simulation.speed = speedLevels[currentSpeedIndex];
        if (speedLabel) {
            speedLabel.textContent = `Velocidade: ${simulation.speed}x`;
        }
    }

    if (playPauseButton) {
        playPauseButton.addEventListener('click', () => {
            simulation.isPlaying = !simulation.isPlaying;
            playPauseButton.textContent = simulation.isPlaying ? 'Pause' : 'Play';
        });
    }

    if (forwardButton) {
        forwardButton.addEventListener('click', () => {
            if (currentSpeedIndex < speedLevels.length - 1) {
                currentSpeedIndex++;
                updateSpeed();
            }
        });
    }

    if (rewindButton) {
        rewindButton.addEventListener('click', () => {
            if (currentSpeedIndex > 0) {
                currentSpeedIndex--;
                updateSpeed();
            }
        });
    }

    requestAnimationFrame(render);
}

main();