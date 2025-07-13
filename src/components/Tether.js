import * as THREE from 'three';
import gsap from 'gsap';
import vertexShader from '../shaders/tether/vertex.glsl';
import fragmentShader from '../shaders/tether/fragment.glsl';

const TETHER_COLORS = {
    'Design': new THREE.Color('#FF4136'),
    'Development': new THREE.Color('#0074D9'),
    'Video Editing': new THREE.Color('#2ECC40')
};

export class Tether {
    constructor(sun, planet) {
        this.sun = sun;
        this.planet = planet;
        this.numPoints = 200; // More points for a smoother helix

        // A direct line for the particles to wrap around
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.numPoints * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const progress = new Float32Array(this.numPoints);
        for(let i = 0; i < this.numPoints; i++) {
            progress[i] = i / (this.numPoints - 1);
        }
        geometry.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));

        // Create the shader material with our new uniforms
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: TETHER_COLORS[this.sun.userData.id] },
                uBrightness: { value: 0.15 }, // Default: faint
                uHelixRadius: { value: 0.2 }, // Default: thin
                uHelixSpeed: { value: 0.5 },  // Default: slow
                uPulseTime: { value: -1.0 }   // Default: no pulse
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.mesh = new THREE.Points(geometry, material);
    }

    // --- State Change Methods ---
    onHoverStart() {
        gsap.to(this.mesh.material.uniforms.uBrightness, { value: 0.5, duration: 0.3 });
        gsap.to(this.mesh.material.uniforms.uHelixSpeed, { value: 1.0, duration: 0.3 });
        // Animate the pulse from sun to planet
        gsap.fromTo(this.mesh.material.uniforms.uPulseTime, 
            { value: 0.0 }, 
            { value: 1.0, duration: 1.0, ease: 'power2.inOut' }
        );
    }

    onHoverEnd() {
        gsap.to(this.mesh.material.uniforms.uBrightness, { value: 0.15, duration: 0.3 });
        gsap.to(this.mesh.material.uniforms.uHelixSpeed, { value: 0.5, duration: 0.3 });
    }
    
    onDragStart() {
        gsap.to(this.mesh.material.uniforms.uBrightness, { value: 1.0, duration: 0.5 });
        gsap.to(this.mesh.material.uniforms.uHelixRadius, { value: 0.8, duration: 0.5 });
        gsap.to(this.mesh.material.uniforms.uHelixSpeed, { value: 1.2, duration: 0.5 });
    }

    onDragEnd(isHovering) {
        // If the mouse is still over the planet, transition to hover state, else default state.
        if (isHovering) {
            this.onHoverStart();
        } else {
            this.onHoverEnd();
        }
        gsap.to(this.mesh.material.uniforms.uHelixRadius, { value: 0.2, duration: 0.5 });
    }

    update(elapsedTime) {
        // Update the positions array for the line
        const positions = this.mesh.geometry.attributes.position.array;
        const sunPos = this.sun.position;
        const planetPos = this.planet.position;
        
        for (let i = 0; i < this.numPoints; i++) {
            const t = i / (this.numPoints - 1); // 0 to 1
            const p = new THREE.Vector3().lerpVectors(sunPos, planetPos, t);
            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
        }
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.material.uniforms.uTime.value = elapsedTime;
    }
}