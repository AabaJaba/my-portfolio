// src/main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { Universe } from './Universe.js';
import { Starfield } from './components/Starfield.js';  

class World {
    constructor() {
        this.scene = new THREE.Scene();
        this.container = document.querySelector('#app');
        this.universe = new Universe(this.scene);
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false 
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
        this.camera.layers.enableAll();

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; 
        this.controls.enableRotate = false;
        this.controls.enablePan = false;

        this.clock = new THREE.Clock();

        this.raycaster = new THREE.Raycaster();
        this.raycaster.layers.set(1);
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane();
        this.intersection = new THREE.Vector3();
        
        this.selectedNode = null;
        this.hoveredPlanet = null;
        this.isPanning = false;
        this.panStartPoint = new THREE.Vector3();

        this.init();
        this.addEventListeners();
        this.animate();
    }

    async init() {
        console.log('World Initialized');
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        this.starfield = new Starfield();
        this.scene.add(this.starfield.mesh);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);

        await this.universe.build();
        this.waitForSimulationAndFrame(); 
    }

    waitForSimulationAndFrame() {
        // This function will check the simulation's "energy" (alpha)
        const checkAlpha = () => {
            // Wait until the simulation has cooled down significantly (e.g., alpha < 0.1)
            if (this.universe.simulation.alpha() < 0.1) {
                this.frameScene();
            } else {
                // If not cool yet, check again on the next animation frame
                requestAnimationFrame(checkAlpha);
            }
        };
        // Start checking
        requestAnimationFrame(checkAlpha);
    }

    frameScene() {
        const constellation = this.universe.threeObjects;
        if (constellation.children.length === 0) return;

        const boundingBox = new THREE.Box3().setFromObject(constellation);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        const maxDim = Math.max(size.x, size.y, 50);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.2; 
        
        this.camera.position.set(center.x, center.y, cameraZ);
        this.controls.target.copy(center);
        this.controls.maxDistance = cameraZ * 1.5;
        this.controls.minDistance = cameraZ / 5;
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
        // --- FIX: Update mouse position BEFORE using it for panning raycast ---
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

        if (this.hoveredPlanet) {
            this.isPanning = false;
            const planetMesh = this.hoveredPlanet;
            this.selectedNode = this.universe.simulation.nodes().find(node => node.id === planetMesh.userData.id);

            if (this.selectedNode) {
                this.universe.tethers
                    .filter(t => t.planet.userData.id === this.selectedNode.id)
                    .forEach(t => t.onDragStart());

                this.selectedNode.fx = this.selectedNode.x;
                this.selectedNode.fy = this.selectedNode.y;
                this.selectedNode.fz = 0;
                
                this.camera.getWorldDirection(this.dragPlane.normal);
                this.dragPlane.setFromNormalAndCoplanarPoint(this.dragPlane.normal, planetMesh.position);
            }
        } else {
            this.isPanning = true;
            document.body.style.cursor = 'grabbing';
            this.camera.getWorldDirection(this.dragPlane.normal);
            this.dragPlane.setFromNormalAndCoplanarPoint(this.dragPlane.normal, this.controls.target);

            this.raycaster.setFromCamera(this.mouse, this.camera);
            this.raycaster.ray.intersectPlane(this.dragPlane, this.panStartPoint);
        }
    }

    onPointerMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

        if (this.selectedNode) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                this.selectedNode.fx = this.intersection.x;
                this.selectedNode.fy = this.intersection.y;
                this.selectedNode.fz = 0;
                this.universe.simulation.alphaTarget(0.3).restart();
            }
        } else if (this.isPanning) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                const delta = this.panStartPoint.clone().sub(this.intersection);
                this.camera.position.add(delta);
                this.controls.target.add(delta);
            }
        } else {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.universe.threeObjects.children);
            const firstIntersect = intersects.length > 0 ? intersects[0].object : null;

            if (this.hoveredPlanet && (!firstIntersect || this.hoveredPlanet.userData.id !== firstIntersect.userData.id)) {
                document.body.style.cursor = 'default';
                this.universe.tethers
                    .filter(t => t.planet.userData.id === this.hoveredPlanet.userData.id)
                    .forEach(t => t.onHoverEnd());
                this.hoveredPlanet = null;
            }

            if (firstIntersect && !this.hoveredPlanet) {
                document.body.style.cursor = 'grab';
                this.hoveredPlanet = firstIntersect;
                this.universe.tethers
                    .filter(t => t.planet.userData.id === this.hoveredPlanet.userData.id)
                    .forEach(t => t.onHoverStart());
            }
        }
    }

    onPointerUp() {
        if (this.selectedNode) {
            const isStillHovering = this.hoveredPlanet && this.hoveredPlanet.userData.id === this.selectedNode.id;
            this.universe.tethers
                .filter(t => t.planet.userData.id === this.selectedNode.id)
                .forEach(t => t.onDragEnd(isStillHovering));
            
            this.selectedNode.fx = null;
            this.selectedNode.fy = null;
            this.selectedNode.fz = null;
            this.universe.simulation.alphaTarget(0);
            this.selectedNode = null;
            
            // --- FIX: Reset cursor correctly after dragging ---
            if (!isStillHovering) {
                document.body.style.cursor = 'default';
            }
        }
        
        if (this.isPanning) {
            this.isPanning = false;
            document.body.style.cursor = this.hoveredPlanet ? 'grab' : 'default';
        }
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const elapsedTime = this.clock.getElapsedTime();
        this.universe.update(elapsedTime);
        
        this.starfield.update(elapsedTime);
        
        if (!this.selectedNode && !this.isPanning) {
            this.controls.update(); 
        }
        
        this.renderer.render(this.scene, this.camera);
    // --- FIX: Added the missing closing brace ---
    }
}

new World();