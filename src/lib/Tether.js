import * as THREE from 'three';
import gsap from 'gsap';
// Ensure your shader imports point to the correct files
import vertexShader from '../shaders/tether/vertex.glsl';
import fragmentShader from '../shaders/tether/fragment.glsl';

// This map remains the same
const TETHER_COLORS = {
    'Design': new THREE.Color('#FF4136'),
    'Development': new THREE.Color('#0074D9'),
    'Video Editing': new THREE.Color('#2ECC40')
};

export class Tether {
    constructor(sun, planet) {
        this.sun = sun;
        this.planet = planet;
        this.numPoints = 200;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.numPoints * 3);
        const progress = new Float32Array(this.numPoints);

        for(let i = 0; i < this.numPoints; i++) {
            // This sets the aProgress attribute from 0.0 to 1.0
            progress[i] = i / (this.numPoints - 1);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));

        // Create the shader material with the NEW set of uniforms
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                // Uniforms used by BOTH shaders
                uTime: { value: 0 },
                
                // Uniforms for vertex.glsl (helix & pulse)
                uHelixRadius: { value: 0.2 }, // Default: thin helix
                uHelixSpeed: { value: 0.5 },  // Default: slow rotation
                uPulseTime: { value: -2.0 },  // Default: pulse is off-screen
                
                // Uniforms for fragment.glsl (color & visibility)
                uColor: { value: TETHER_COLORS[this.sun.userData.id] },
                uBrightness: { value: 0.25 }, // Default: faint but visible
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.mesh = new THREE.Points(geometry, material);
    }

    // --- State Change Methods ---
    // These are now adapted for the new shader logic

    onHoverStart() {
        // Make the tether brighter and spin faster
        gsap.to(this.mesh.material.uniforms.uBrightness, { value: 0.7, duration: 0.3 });
        gsap.to(this.mesh.material.uniforms.uHelixSpeed, { value: 1.0, duration: 0.3 });
        
        // The pulse is a traveling wave of larger points.
        // We animate uPulseTime from 0 (sun) to 1 (planet).
        gsap.fromTo(this.mesh.material.uniforms.uPulseTime, 
            { value: 0.0 }, 
            { value: 1.0, duration: 1.0, ease: 'power2.inOut' }
        );
    }

    onHoverEnd() {
        // Return to the faint, slow default state
        gsap.to(this.mesh.material.uniforms.uBrightness, { value: 0.25, duration: 0.3 });
        gsap.to(this.mesh.material.uniforms.uHelixSpeed, { value: 0.5, duration: 0.3 });
    }
    
    onDragStart() {
        // Make the tether very bright, wide, and fast to show it's being pulled
        gsap.to(this.mesh.material.uniforms.uBrightness, { value: 1.0, duration: 0.5 });
        gsap.to(this.mesh.material.uniforms.uHelixRadius, { value: 0.8, duration: 0.5 });
        gsap.to(this.mesh.material.uniforms.uHelixSpeed, { value: 1.5, duration: 0.5 });
    }

    onDragEnd(isHovering) {
        // If the mouse is still over the planet, transition to the hover state.
        // Otherwise, transition back to the default state.
        if (isHovering) {
            this.onHoverStart();
        } else {
            this.onHoverEnd();
        }
        // Always return the helix radius to its thin default state
        gsap.to(this.mesh.material.uniforms.uHelixRadius, { value: 0.2, duration: 0.5 });
    }

    // This method remains the same, as it correctly updates the base line and time
    update(elapsedTime) {
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