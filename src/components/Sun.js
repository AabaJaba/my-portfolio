// src/components/Sun.js
import * as THREE from 'three';
// Imports for the outer shell (atmosphere)
import shellVertexShader from '../shaders/sun/vertex.glsl';
import shellFragmentShader from '../shaders/sun/fragment.glsl';

// Imports for the inner core
import coreVertexShader from '../shaders/sunCore/vertex.glsl';
import coreFragmentShader from '../shaders/sunCore/fragment.glsl';

const textureLoader = new THREE.TextureLoader();
// Ensure the /public/textures/noise.png file exists
const noiseTexture = textureLoader.load('/textures/noise.png');
noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;

const SUN_CONFIG = {
    'Design': { core: new THREE.Color('#FF4136'), corona: new THREE.Color('#FF851B') },
    'Development': { core: new THREE.Color('#0074D9'), corona: new THREE.Color('#7FDBFF') },
    'Video Editing': { core: new THREE.Color('#2ECC40'), corona: new THREE.Color('#AFFF9E') }
};


export function createSun(skillName) {
    const config = SUN_CONFIG[skillName];
    const sunGroup = new THREE.Group();

    // --- 1. The Inner Core ---
    const coreGeometry = new THREE.SphereGeometry(1.5, 32, 32); 
    const coreMaterial = new THREE.ShaderMaterial({
        vertexShader: coreVertexShader,
        fragmentShader: coreFragmentShader,
        uniforms: {
            uColor1: { value: config.core },
            uColor2: { value: new THREE.Color(config.core).multiplyScalar(0.5) },
            uTime: { value: 0 },
        },
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    
    // --- 2. The Outer Shell (Atmosphere) ---
    const shellGeometry = new THREE.IcosahedronGeometry(3.5, 30); // Using your previous size of 3.5

    // --- FIX: Use the correct shader variables for the shell ---
    const shellMaterial = new THREE.ShaderMaterial({
        vertexShader: shellVertexShader,
        fragmentShader: shellFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uNoiseAmount: { value: 0.15 },
            uCoreColor: { value: config.core },
            uCoronaColor: { value: config.corona },
            uNoiseTexture: { value: noiseTexture }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false, 
    });
    const shellMesh = new THREE.Mesh(shellGeometry, shellMaterial);

    // --- 3. Combine them ---
    sunGroup.add(coreMesh);
    sunGroup.add(shellMesh);

    sunGroup.userData.id = skillName;
    sunGroup.userData.type = 'sun';
    sunGroup.userData.coreMaterial = coreMaterial;
    sunGroup.userData.shellMaterial = shellMaterial;
    
    return sunGroup;
}