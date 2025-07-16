import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { Galaxy } from '../lib/Galaxy.js';
import { Universe } from '../lib/Universe.js';

// The entire World class, adapted to work within the hook's lifecycle.
class World {
    constructor(container, navigate) {
        this.container = container;
        this.navigate = navigate; // Use React Router's navigation

        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.camera = new THREE.PerspectiveCamera(55, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane();
        this.intersection = new THREE.Vector3();
        
        this.selectedNode = null;
        this.hoveredPlanet = null;
        this.hoveredSun = null;
        this.isPanning = false;
        this.panStartPoint = new THREE.Vector3();
        this.isHoveringBlackHole = false;

        // Bind methods to ensure 'this' context is correct
        this.onResize = this.onResize.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.animate = this.animate.bind(this);

        this.setup();
        this.init();
        this.addEventListeners();
        this.animate();
    }

    setup() {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.setClearColor('#0A0A10');
        this.container.appendChild(this.renderer.domElement);

        this.camera.position.set(0, 0, 100);
        this.camera.layers.enableAll();

        this.controls.enableDamping = true;
        this.controls.enableRotate = false;
        this.controls.enablePan = false;
    }

    async init() {
        console.log('World Initialized');
        this.universe = new Universe(this.scene);

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
                this.animationFrameId = requestAnimationFrame(checkAlpha);
            }
        };
        this.animationFrameId = requestAnimationFrame(checkAlpha);
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
        gsap.to(this.camera.position, { x: center.x, y: center.y, z: cameraZ, duration: 1.5, ease: 'power3.inOut' });
        gsap.to(this.controls.target, { x: center.x, y: center.y, z: center.z, duration: 1.5, ease: 'power3.inOut' });
        this.controls.target.copy(center);
        this.controls.maxDistance = cameraZ * 1.5;
        this.controls.minDistance = cameraZ / 5;
        this.controls.update();
        this.overviewCameraState = {
            position: this.camera.position.clone(),
            target: this.controls.target.clone()
        };
    }

    addEventListeners() {
        window.addEventListener('resize', this.onResize);
        window.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
    }

    onResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    onPointerDown(event) {
        this.mouse.x = (event.clientX / this.container.clientWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / this.container.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        this.raycaster.layers.set(0);
        if (this.galaxy.blackHoleMesh) {
            const blackHoleIntersects = this.raycaster.intersectObject(this.galaxy.blackHoleMesh);
            if (blackHoleIntersects.length > 0) {
                // *** THE FIX: Use React Router navigation ***
                this.navigate('/about');
                return;
            }
        }

        this.raycaster.layers.set(1);
        const intersects = this.raycaster.intersectObjects(this.universe.threeObjects.children, true);
        const planetIntersect = intersects.find(i => {
            let parent = i.object;
            while(parent.parent && !parent.userData.type) { parent = parent.parent; }
            return parent.userData.type === 'planet';
        });

        if (planetIntersect) {
            const planetMesh = planetIntersect.object.userData.type === 'planet' ? planetIntersect.object : planetIntersect.object.parent;
            this.isPanning = false;
            this.selectedNode = this.universe.simulation.nodes().find(node => node.id === planetMesh.userData.id);
            if (this.selectedNode) {
                this.universe.tethers.filter(t => t.planet.userData.id === this.selectedNode.id).forEach(t => t.onDragStart());
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
            this.raycaster.ray.intersectPlane(this.dragPlane, this.panStartPoint);
        }
    }

    onPointerMove(event) {
        this.mouse.x = (event.clientX / this.container.clientWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / this.container.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        if (this.selectedNode) {
            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                this.selectedNode.fx = this.intersection.x;
                this.selectedNode.fy = this.intersection.y;
                this.selectedNode.fz = 0;
                this.universe.simulation.alphaTarget(0.3).restart();
            }
        } else if (this.isPanning) {
            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                const delta = this.panStartPoint.clone().sub(this.intersection);
                this.camera.position.add(delta);
                this.controls.target.add(delta);
            }
        } else {
            this.raycaster.layers.set(1);
            const intersects = this.raycaster.intersectObjects(this.universe.threeObjects.children, true);
            let intersectedObject = null;
            if (intersects.length > 0) {
                let parent = intersects[0].object;
                while (parent.parent && !parent.userData.type) { parent = parent.parent; }
                intersectedObject = parent;
            }
            const newHoveredPlanet = (intersectedObject && intersectedObject.userData.type === 'planet') ? intersectedObject : null;
            const newHoveredSun = (intersectedObject && intersectedObject.userData.type === 'sun') ? intersectedObject : null;
            if (this.hoveredPlanet !== newHoveredPlanet) {
                if (this.hoveredPlanet) this.universe.tethers.filter(t => t.planet.userData.id === this.hoveredPlanet.userData.id).forEach(t => t.onHoverEnd());
                if (newHoveredPlanet) this.universe.tethers.filter(t => t.planet.userData.id === newHoveredPlanet.userData.id).forEach(t => t.onHoverStart());
                this.hoveredPlanet = newHoveredPlanet;
            }
            if (this.hoveredSun !== newHoveredSun) {
                if (this.hoveredSun) this.universe.onSunHoverEnd(this.hoveredSun);
                if (newHoveredSun) this.universe.onSunHoverStart(newHoveredSun);
                this.hoveredSun = newHoveredSun;
            }
            this.raycaster.layers.set(0);
            if (this.galaxy && this.galaxy.blackHoleMesh) {
                const blackHoleIntersects = this.raycaster.intersectObject(this.galaxy.blackHoleMesh);
                const isCurrentlyOver = blackHoleIntersects.length > 0;
                if (isCurrentlyOver && !this.isHoveringBlackHole) {
                    this.isHoveringBlackHole = true;
                    gsap.to(this.galaxy.galaxyMaterial.uniforms.uWaveStrength, { value: 1.0, duration: 1.5, ease: 'power2.out' });
                } else if (!isCurrentlyOver && this.isHoveringBlackHole) {
                    this.isHoveringBlackHole = false;
                    gsap.to(this.galaxy.galaxyMaterial.uniforms.uWaveStrength, { value: 0.0, duration: 1.5, ease: 'power2.out' });
                }
            }
            if (this.hoveredPlanet) document.body.style.cursor = 'grab';
            else if (this.hoveredSun || this.isHoveringBlackHole) document.body.style.cursor = 'pointer';
            else document.body.style.cursor = 'default';
        }
    }

    onPointerUp() {
        if (this.selectedNode) {
            const isStillHovering = this.hoveredPlanet && this.hoveredPlanet.userData.id === this.selectedNode.id;
            this.universe.tethers.filter(t => t.planet.userData.id === this.selectedNode.id).forEach(t => t.onDragEnd(isStillHovering));
            this.selectedNode.fx = null;
            this.selectedNode.fy = null;
            this.selectedNode.fz = null;
            this.universe.simulation.alphaTarget(0);
            this.selectedNode = null;
            if (!isStillHovering) document.body.style.cursor = 'default';
        }
        
        if (this.isPanning) {
            this.isPanning = false;
            document.body.style.cursor = 'default';
        }
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate);
        const elapsedTime = this.clock.getElapsedTime();
        const deltaTime = this.clock.getDelta();
        if (this.universe) this.universe.update(elapsedTime);
        if (this.galaxy) this.galaxy.update(elapsedTime, deltaTime);
        if (!this.selectedNode && !this.isPanning) {
            this.controls.update();
        }
        this.renderer.render(this.scene, this.camera);
    }
    
    // *** THE FIX: Cleanup method to prevent memory leaks ***
    destroy() {
        console.log("Destroying World");
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);

        cancelAnimationFrame(this.animationFrameId);

        this.renderer.dispose();
        // You should also dispose of geometries, materials, and textures in a real app
        this.scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        this.container.removeChild(this.renderer.domElement);
    }
}

// The custom hook that manages the World instance
export const useWorld = (containerRef) => {
    const worldRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (containerRef.current && !worldRef.current) {
            // Create the World instance only after the container is ready
            const worldInstance = new World(containerRef.current, navigate);
            worldRef.current = worldInstance;
        }

        // Return a cleanup function that will be called when the component unmounts
        return () => {
            if (worldRef.current) {
                worldRef.current.destroy();
                worldRef.current = null;
            }
        };
    }, [containerRef, navigate]); // Dependencies for the effect
};