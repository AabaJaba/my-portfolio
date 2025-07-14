import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { Universe } from './Universe.js';
import { Galaxy } from './components/Galaxy.js';  

class World {
    // ... constructor, init, and other methods are unchanged ...
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
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane();
        this.intersection = new THREE.Vector3();
        
        this.selectedNode = null;
        this.hoveredPlanet = null;
        this.isPanning = false;
        this.panStartPoint = new THREE.Vector3();
        this.isHoveringBlackHole = false;

        this.init();
        this.addEventListeners();
        this.animate();
    }

    async init() {
        console.log('World Initialized');
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        this.galaxy = new Galaxy(this.scene);
        this.scene.add(this.galaxy.mesh);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);

        await this.universe.build();
        this.waitForSimulationAndFrame(); 
    }

    waitForSimulationAndFrame() {
        const checkAlpha = () => {
            if (this.universe.simulation && this.universe.simulation.alpha() < 0.1) {
                this.frameScene();
            } else {
                requestAnimationFrame(checkAlpha);
            }
        };
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

        gsap.to(this.camera.position, {
            x: center.x,
            y: center.y,
            z: cameraZ,
            duration: 1.5,
            ease: 'power3.inOut'
        });

        gsap.to(this.controls.target, {
            x: center.x,
            y: center.y,
            z: center.z,
            duration: 1.5,
            ease: 'power3.inOut'
        });
        
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
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

        // The ray needs to be updated here too, to check what we're clicking on.
        this.raycaster.setFromCamera(this.mouse, this.camera);
        this.raycaster.layers.set(1);
        const intersects = this.raycaster.intersectObjects(this.universe.threeObjects.children);
        
        if (intersects.length > 0) {
            // Clicked on a planet
            this.hoveredPlanet = intersects[0].object; // Ensure hoveredPlanet is set
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
            // Clicked on empty space
            this.isPanning = true;
            document.body.style.cursor = 'grabbing';
            this.camera.getWorldDirection(this.dragPlane.normal);
            this.dragPlane.setFromNormalAndCoplanarPoint(this.dragPlane.normal, this.controls.target);

            // We need to re-update the raycaster here for the panning plane intersection
            this.raycaster.setFromCamera(this.mouse, this.camera);
            this.raycaster.ray.intersectPlane(this.dragPlane, this.panStartPoint);
        }
    }

    onPointerMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        
        // --- FIX #1: ALWAYS update the raycaster at the beginning of the move event. ---
        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (this.selectedNode) {
            // --- DRAGGING A PLANET ---
            // This now works because the raycaster is always up-to-date.
            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                this.selectedNode.fx = this.intersection.x;
                this.selectedNode.fy = this.intersection.y;
                this.selectedNode.fz = 0; // Keep it on the Z=0 plane
                this.universe.simulation.alphaTarget(0.3).restart();
            }
        } else if (this.isPanning) {
            // --- PANNING THE SCENE ---
            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                const delta = this.panStartPoint.clone().sub(this.intersection);
                this.camera.position.add(delta);
                this.controls.target.add(delta);
            }
        } else {
            // --- HOVERING LOGIC (when not dragging or panning) ---
            
            // Task 1: Check for hovering over a planet (Layer 1)
            this.raycaster.layers.set(1);
            const planetIntersects = this.raycaster.intersectObjects(this.universe.threeObjects.children);
            const intersectedPlanet = planetIntersects.length > 0 ? planetIntersects[0].object : null;

            if (this.hoveredPlanet && this.hoveredPlanet !== intersectedPlanet) {
                // Mouse is LEAVING a planet
                this.universe.tethers
                    .filter(t => t.planet.userData.id === this.hoveredPlanet.userData.id)
                    .forEach(t => t.onHoverEnd());
                this.hoveredPlanet = null;
            }

            if (intersectedPlanet && intersectedPlanet !== this.hoveredPlanet) {
                // Mouse is ENTERING a new planet
                this.hoveredPlanet = intersectedPlanet;
                this.universe.tethers
                    .filter(t => t.planet.userData.id === this.hoveredPlanet.userData.id)
                    .forEach(t => t.onHoverStart());
            }

            // Task 2: Check for hovering over the black hole (Layer 0)
            this.raycaster.layers.set(0); // Explicitly check only layer 0
            if (this.galaxy && this.galaxy.blackHoleMesh) {
                const blackHoleIntersects = this.raycaster.intersectObject(this.galaxy.blackHoleMesh);
                
                if (blackHoleIntersects.length > 0 && !this.isHoveringBlackHole) {
                    // ENTERING black hole
                    this.isHoveringBlackHole = true;
                    gsap.to(this.galaxy.galaxyMaterial.uniforms.uWaveStrength, {
                        value: 1.0, duration: 1.5, ease: 'power2.out'
                    });
                } else if (blackHoleIntersects.length === 0 && this.isHoveringBlackHole) {
                    // LEAVING black hole
                    this.isHoveringBlackHole = false;
                    gsap.to(this.galaxy.galaxyMaterial.uniforms.uWaveStrength, {
                        value: 0.0, duration: 1.5, ease: 'power2.out'
                    });
                }
            }
            
            // Task 3: Set the cursor based on what's being hovered
            if (this.hoveredPlanet) {
                document.body.style.cursor = 'grab';
            } else if (this.isHoveringBlackHole) {
                document.body.style.cursor = 'pointer';
            } else {
                document.body.style.cursor = 'default';
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
        const deltaTime = this.clock.getDelta();
        
        if (this.universe) this.universe.update(elapsedTime);
        if (this.galaxy) this.galaxy.update(elapsedTime, deltaTime);
        
        if (!this.selectedNode && !this.isPanning) {
            this.controls.update(); 
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

new World();