import * as THREE from 'three';
// Import the shaders as strings using our vite plugin
import vertexShader from '../shaders/sun/vertex.glsl';
import fragmentShader from '../shaders/sun/fragment.glsl';

const SUN_CONFIG = {
    'Design': { core: new THREE.Color('#FF4136'), corona: new THREE.Color('#FF851B') },
    'Development': { core: new THREE.Color('#0074D9'), corona: new THREE.Color('#7FDBFF') },
    'Video Editing': { core: new THREE.Color('#2ECC40'), corona: new THREE.Color('#AFFF9E') }
};

export function createSun(skillName) {
    const config = SUN_CONFIG[skillName];
    
    const geometry = new THREE.IcosahedronGeometry(3, 30); // High subdivision for a smooth sphere
    
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uNoiseAmount: { value: 0.15 },
            uCoreColor: { value: config.core },
            uCoronaColor: { value: config.corona },
        },
        transparent: true,
        // Additive blending makes colors add up when overlapping, perfect for glows
        blending: THREE.AdditiveBlending, 
        // Important: ensures the object doesn't hide things behind it
        depthWrite: false, 
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.id = skillName;
    mesh.userData.type = 'sun';
    
    return mesh;
}