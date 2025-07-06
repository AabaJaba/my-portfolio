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
        this.camera.position.set(0, 0, 100);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; 
        this.controls.maxDistance = 100;
        this.controls.minDistance = 5;
        this.controls.enableRotate = false; // Disables left-click-drag rotation
        this.controls.enablePan = true;    // Disables right-click-drag panning

        this.clock = new THREE.Clock();

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane();
        this.selectedNode = null; // This will hold the D3 node we are dragging
        this.intersection = new THREE.Vector3(); // A reusable vecto
        
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
        setTimeout(() => this.frameScene(), 100); 
    }

    frameScene() {
        const constellation = this.universe.threeObjects;
        if (constellation.children.length === 0) return;

        // 1. Calculate the bounding box of the entire constellation
        const boundingBox = new THREE.Box3().setFromObject(constellation);
        
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        // 2. Calculate the ideal camera distance
        // Use the largest dimension (width or height) to determine the distance
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        
        // Add some padding so the elements aren't right at the edge
        cameraZ *= 1.2; 
        
        // 3. Set the camera's initial position and zoom limits
        this.camera.position.set(center.x, center.y, cameraZ);
        
        // Look at the center of the scene
        this.controls.target.copy(center);

        // 4. Set zoom limits to prevent zooming out too far or in too close
        this.controls.maxDistance = cameraZ * 1.5;   // Can't zoom out more than 50%
        this.controls.minDistance = cameraZ / 5;      // Can't zoom in past a certain point

        // Update the controls to apply the new target
        this.controls.update();
    }
    
    addEventListeners() {
        window.addEventListener('resize', this.onResize.bind(this));
        window.addEventListener('pointerdown', this.onPointerDown.bind(this));
        window.addEventListener('pointermove', this.onPointerMove.bind(this));
        window.addEventListener('pointerup', this.onPointerUp.bind(this));
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

     onPointerDown(event) {
        // Update mouse coordinates (normalized from -1 to 1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Find all objects the ray intersects with
        const intersects = this.raycaster.intersectObjects(this.universe.threeObjects.children);

        if (intersects.length > 0) {
            const firstIntersect = intersects[0].object;

            // Check if we clicked on a planet
            if (firstIntersect.userData.type === 'planet') {
                // Find the corresponding node in the physics simulation
                this.selectedNode = this.universe.simulation.nodes().find(node => node.id === firstIntersect.userData.id);

                if (this.selectedNode) {
                    // "Pin" the node by setting its fixed position properties (fx, fy, fz)
                    this.selectedNode.fx = this.selectedNode.x;
                    this.selectedNode.fy = this.selectedNode.y;
                    this.selectedNode.fz = this.selectedNode.z;
                    
                    // Define a plane to drag along. It's positioned at the planet's depth
                    // and oriented towards the camera.
                    this.camera.getWorldDirection(this.dragPlane.normal);
                    this.dragPlane.setFromNormalAndCoplanarPoint(this.dragPlane.normal, firstIntersect.position);
                }
            }
        }
    }

    onPointerMove(event) {
        // Only run this if we are currently dragging a planet
        if (this.selectedNode) {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);

            // Find where the mouse ray intersects with our invisible drag plane
            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                // Update the pinned position of the D3 node to the intersection point.
                this.selectedNode.fx = this.intersection.x;
                this.selectedNode.fy = this.intersection.y;
                // Since the scene is flattened, we keep fz at 0
                this.selectedNode.fz = 0; 
                
                // "Reheat" the simulation to make the tethers react live
                this.universe.simulation.alphaTarget(0.3).restart();
            }
        }
    }

    onPointerUp() {
        if (this.selectedNode) {
            // "Unpin" the node by clearing its fixed position. The simulation takes over again.
            this.selectedNode.fx = null;
            this.selectedNode.fy = null;
            // fz is already null, but good practice to clear it
            this.selectedNode.fz = null; 
            
            // Let the simulation cool down
            this.universe.simulation.alphaTarget(0);

            // Reset our state
            this.selectedNode = null;
        }
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