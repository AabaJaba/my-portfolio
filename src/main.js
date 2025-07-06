// src/main.js (Corrected with Lights)
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { Universe } from './Universe.js';

class World {
    constructor() {
        this.scene = new THREE.Scene();
        this.container = document.querySelector('#app');
        this.universe = new Universe(this.scene);
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true 
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.setClearColor('#0A0A10'); 
        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(
            55,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 200);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; 
        this.controls.maxDistance = 100;
        this.controls.minDistance = 5;

        this.clock = new THREE.Clock();
        
        this.init();
        this.addEventListeners();
        this.animate();
    }

    async init() {
        console.log('World Initialized');
        
        // --- FIX: ADD LIGHTS BACK INTO THE SCENE ---
        // An ambient light illuminates all objects in the scene equally.
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Use a soft intensity
        this.scene.add(ambientLight);

        // A directional light acts like a distant sun, creating highlights and shadows.
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7); // Pointing from the top-right
        this.scene.add(directionalLight);
        // --- END OF FIX ---

        await this.universe.build();
    }
    
    addEventListeners() {
        window.addEventListener('resize', this.onResize.bind(this));
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const elapsedTime = this.clock.getElapsedTime();
        this.universe.update(elapsedTime);
        
        this.controls.update(); 
        this.renderer.render(this.scene, this.camera);
    }
}

new World();