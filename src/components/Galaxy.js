import * as THREE from 'three';
import galaxyVertexShader from '../shaders/galaxy/vertex.glsl';
import galaxyFragmentShader from '../shaders/galaxy/fragment.glsl';

const starfieldVertexShader = `
  attribute float size;
  attribute vec3 customColor;
  attribute float shimmer;
  uniform float uTime;
  varying vec3 vColor;

  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float twinkle = sin(shimmer + uTime * 0.5) * 0.5 + 0.5;
    gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starfieldFragmentShader = `
  varying vec3 vColor;
  void main() {
    if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

export class Galaxy {
    constructor(scene) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.mesh.rotation.x = -Math.PI / 2;

        this.parameters = {
            count: 100000,
            size: 0.015,
            radius: 18,
            branches: 3,
            spin: 0.3,
            randomness: 0.5,
            randomnessPower: 3,
            insideColor: '#dddddd',
            outsideColor: '#111111',
            rotationSpeed: 0.1
        };

        this.galaxyPoints = null;
        this.galaxyGeometry = null;
        this.galaxyMaterial = null;
        this.shootingStars = [];
        this.lastShotTime = 0;
        this.starfieldMaterials = [];
        this.blackHoleMesh = null;

        // FIX #1: Call the correctly named function.
        // FIX #2: Removed the duplicate inline black hole creation from here.
        this._generateBlackHole();
        this._generateGalaxy();
        this._generateStarfield(); 
    }

    _generateBlackHole() {
        const blackHoleGeometry = new THREE.SphereGeometry(2, 32, 32);
        const blackHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.blackHoleMesh = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
        
        // No layer setting needed here; we will manage it in the raycaster.
        this.mesh.add(this.blackHoleMesh);
    }

    _generateGalaxy() {
        if (this.galaxyPoints !== null) {
            this.galaxyGeometry.dispose();
            this.galaxyMaterial.dispose();
            this.mesh.remove(this.galaxyPoints);
        }

        this.galaxyGeometry = new THREE.BufferGeometry();
        // ... (Buffer creation logic is unchanged) ...
        const positions = new Float32Array(this.parameters.count * 3);
        const colors = new Float32Array(this.parameters.count * 3);
        const colorInside = new THREE.Color(this.parameters.insideColor);
        const colorOutside = new THREE.Color(this.parameters.outsideColor);

        for (let i = 0; i < this.parameters.count; i++) {
            const i3 = i * 3;
            const radius_i = Math.random() * this.parameters.radius;
            const spinAngle = radius_i * this.parameters.spin;
            const branchAngle = ((i % this.parameters.branches) / this.parameters.branches) * Math.PI * 2;
            const randomX = Math.pow(Math.random(), this.parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * this.parameters.randomness * radius_i;
            const randomY = Math.pow(Math.random(), this.parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * this.parameters.randomness * radius_i;
            const randomZ = Math.pow(Math.random(), this.parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * this.parameters.randomness * radius_i;
            positions[i3] = Math.cos(branchAngle + spinAngle) * radius_i + randomX;
            positions[i3 + 1] = randomY;
            positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius_i + randomZ;
            const mixedColor = colorInside.clone();
            mixedColor.lerp(colorOutside, radius_i / this.parameters.radius);
            colors[i3] = mixedColor.r;
            colors[i3 + 1] = mixedColor.g;
            colors[i3 + 2] = mixedColor.b;
        }
        this.galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.galaxyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uSize: { value: this.parameters.size * 30 },
                uMaxSize: { value: 15.0 },
                uFadeInDistance: { value: 2.0 },
                uTime: { value: 0 },
                uRadius: { value: this.parameters.radius },
                uWaveStrength: { value: 0.0 }
            },
            vertexShader: galaxyVertexShader,
            fragmentShader: galaxyFragmentShader,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        this.galaxyPoints = new THREE.Points(this.galaxyGeometry, this.galaxyMaterial);
        this.mesh.add(this.galaxyPoints);
    }
    
    // ... (Rest of the file is unchanged) ...
    _generateStarfield() {
        const layers = [
            { count: 2000, size: 0.3, color: new THREE.Color('#FFFFFF'), distance: 200 },
            { count: 1000, size: 0.4, color: new THREE.Color('#DDDDFF'), distance: 150 },
            { count: 500,  size: 0.5, color: new THREE.Color('#FFFFDD'), distance: 100 }
        ];
        layers.forEach(layer => {
            const vertices = [], colors = [], sizes = [], shimmers = [];
            for (let i = 0; i < layer.count; i++) {
                const theta = 2 * Math.PI * Math.random();
                const phi = Math.acos(2 * Math.random() - 1);
                const x = layer.distance * Math.sin(phi) * Math.cos(theta);
                const y = layer.distance * Math.sin(phi) * Math.sin(theta);
                const z = layer.distance * Math.cos(phi);
                vertices.push(x, y, z);
                colors.push(layer.color.r, layer.color.g, layer.color.b);
                sizes.push(layer.size);
                shimmers.push(Math.random() * 10.0);
            }
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
            geometry.setAttribute('shimmer', new THREE.Float32BufferAttribute(shimmers, 1));
            const material = new THREE.ShaderMaterial({
                uniforms: { uTime: { value: 0.0 } },
                vertexShader: starfieldVertexShader,
                fragmentShader: starfieldFragmentShader,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                transparent: true,
            });
            this.starfieldMaterials.push(material);
            const points = new THREE.Points(geometry, material);
            this.scene.add(points);
        });
    }

    _createShootingStar() {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 50;
        const position = new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
        const direction = new THREE.Vector3().sub(position).normalize();
        const starGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const starMaterial = new THREE.MeshBasicMaterial({ color: "#ffffffee" });
        const starMesh = new THREE.Mesh(starGeometry, starMaterial);
        starMesh.position.copy(position);
        const shootingStar = new THREE.Group();
        shootingStar.add(starMesh);
        shootingStar.userData.direction = direction;
        shootingStar.userData.active = true;
        shootingStar.userData.life = 3;
        this.scene.add(shootingStar);
        this.shootingStars.push(shootingStar);
    }

    update(elapsedTime, deltaTime) {
        this.mesh.rotation.y = elapsedTime * this.parameters.rotationSpeed * 0.1;
        if (this.galaxyMaterial) {
            this.galaxyMaterial.uniforms.uTime.value = elapsedTime;
        }
        this.starfieldMaterials.forEach(mat => {
            mat.uniforms.uTime.value = elapsedTime;
        });
        if (elapsedTime - this.lastShotTime > 2.0 && Math.random() > 0.7) {
            this._createShootingStar();
            this.lastShotTime = elapsedTime;
        }
        this.shootingStars.forEach((star) => {
            if (star.userData.active) {
                star.position.add(star.userData.direction.clone().multiplyScalar(deltaTime * 50));
                star.userData.life -= deltaTime;
                if (star.userData.life <= 0) {
                    star.userData.active = false;
                    this.scene.remove(star);
                }
            }
        });
        this.shootingStars = this.shootingStars.filter(star => star.userData.active);
    }
}