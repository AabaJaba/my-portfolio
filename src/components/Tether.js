import * as THREE from 'three';
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
        this.numPoints = 100;

        // 1. Define the curve
        // We add a control point to make the tether bow outwards slightly.
        this.controlPoint = new THREE.Vector3();
        this.curve = new THREE.CatmullRomCurve3([
            this.sun.position,
            this.controlPoint,
            this.planet.position
        ], false, 'catmullrom', 0.5);

        // 2. Create the geometry with particle data
        const points = this.curve.getPoints(this.numPoints);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Add a custom 'progress' attribute to each vertex for the shader
        const progress = new Float32Array(this.numPoints + 1);
        for(let i = 0; i < progress.length; i++) {
            progress[i] = i / this.numPoints;
        }
        geometry.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));

        // 3. Create the shader material
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: TETHER_COLORS[this.sun.userData.id] }
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // 4. Create the final Points object
        this.mesh = new THREE.Points(geometry, material);
    }

    // This will be called on every frame to update the tether's shape
    update(elapsedTime) {
        // Update the curve points
        this.controlPoint.lerpVectors(this.sun.position, this.planet.position, 0.5).add(new THREE.Vector3(0, 0, 10));
        this.curve.points[0].copy(this.sun.position);
        this.curve.points[1].copy(this.controlPoint);
        this.curve.points[2].copy(this.planet.position);
        
        const points = this.curve.getPoints(this.numPoints);
        this.mesh.geometry.setFromPoints(points);
        this.mesh.geometry.attributes.position.needsUpdate = true;

        // Update the shader time
        this.mesh.material.uniforms.uTime.value = elapsedTime;
    }
}