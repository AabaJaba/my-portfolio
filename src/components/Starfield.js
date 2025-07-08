import * as THREE from 'three';

// Use a single vertex shader for all star layers
const vertexShader = `
  attribute float size;
  attribute vec3 customColor;
  attribute float shimmer;
  uniform float uTime;
  varying vec3 vColor;

  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Make stars twinkle by modulating their size over time
    float twinkle = sin(shimmer + uTime * 0.5) * 0.5 + 0.5;
    gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Use a single fragment shader
const fragmentShader = `
  varying vec3 vColor;

  void main() {
    // Create a soft, circular point
    if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

export class Starfield {
    constructor() {
        // The main object is a Group to hold all layers
        this.mesh = new THREE.Group();
        this.materials = []; // Store materials to update them

        // --- Define the layers ---
        const layers = [
            { count: 1000, size: 0.2, color: new THREE.Color('#FFFFFF'), distance: 200 }, // Farthest, smallest
            { count: 500, size: 0.3, color: new THREE.Color('#DDDDFF'), distance: 150 }, // Middle
            { count: 200, size: 0.4, color: new THREE.Color('#FFFFDD'), distance: 100 }  // Closest, largest
        ];

        layers.forEach(layer => {
            const vertices = [];
            const colors = [];
            const sizes = [];
            const shimmers = [];

            for (let i = 0; i < layer.count; i++) {
                // Generate random positions within a large sphere
                const theta = 2 * Math.PI * Math.random();
                const phi = Math.acos(2 * Math.random() - 1);
                const x = layer.distance * Math.sin(phi) * Math.cos(theta);
                const y = layer.distance * Math.sin(phi) * Math.sin(theta);
                const z = layer.distance * Math.cos(phi);
                vertices.push(x, y, z);
                
                // Add color, size, and shimmer data for each vertex
                colors.push(layer.color.r, layer.color.g, layer.color.b);
                sizes.push(layer.size);
                shimmers.push(Math.random() * 10.0); // Random offset for shimmer animation
            }
            
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
            geometry.setAttribute('shimmer', new THREE.Float32BufferAttribute(shimmers, 1));

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0.0 }
                },
                vertexShader,
                fragmentShader,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                transparent: true,
            });

            this.materials.push(material);
            const points = new THREE.Points(geometry, material);
            this.mesh.add(points);
        });
    }

    // This will be called on every frame to update the shimmer animation
    update(elapsedTime) {
        this.materials.forEach(mat => {
            mat.uniforms.uTime.value = elapsedTime;
        });
    }
}