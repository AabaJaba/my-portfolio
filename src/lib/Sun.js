// src/components/Sun.js
import * as THREE from 'three';
import shellVertexShader from '../shaders/sun/vertex.glsl';
import shellFragmentShader from '../shaders/sun/fragment.glsl';
import coreVertexShader from '../shaders/sunCore/vertex.glsl';
import coreFragmentShader from '../shaders/sunCore/fragment.glsl';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase'; // 1. Import the plugin
gsap.registerPlugin(CustomEase);

const textureLoader = new THREE.TextureLoader();
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
            uAnimationSpeed: { value: 1.0 }
        },
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    
    // --- 2. The Outer Shell (Atmosphere) ---
    const shellGeometry = new THREE.IcosahedronGeometry(3.5, 30);
    const shellMaterial = new THREE.ShaderMaterial({
        vertexShader: shellVertexShader,
        fragmentShader: shellFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uNoiseAmount: { value: 0.15 },
            uCoreColor: { value: config.core },
            uCoronaColor: { value: config.corona },
            uNoiseTexture: { value: noiseTexture },
            uAnimationSpeed: { value: 1.0 }
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

    // --- THE FINAL, CORRECT FIX ---
    // The .traverse() method visits the sunGroup itself AND all of its children
    // (coreMesh and shellMesh), ensuring everything is on the correct layer.
    sunGroup.traverse((object) => {
        object.layers.set(1);
    });
    
    return sunGroup;
}