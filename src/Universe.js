// src/Universe.js (Definitive Fix)
import * as THREE from 'three';
// --- FIX 1: Import the CORRECT function names revealed by our diagnostic log ---
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceZ } from 'd3-force-3d';
import { createPlanet } from './components/Planet.js';
import { createSun } from './components/Sun.js'; 
import { Tether } from './components/Tether.js';

export class Universe {
    constructor(scene) {
        this.scene = scene;
        this.nodes = [];
        this.links = [];
        this.threeObjects = new THREE.Group();
        this.scene.add(this.threeObjects);
        this.tethers = [];
        this.elapsedTime = 0;
    }

    async build() {
        const data = await this.fetchData();
        this.createGraph(data.projects);
        // Re-enable the simulation
        this.initSimulation();
    }
    
    async fetchData() {
        const response = await fetch('/projects.json');
        if (!response.ok) {
            console.error("Failed to fetch projects.json. Make sure it's in the /public directory.", response.statusText);
            return { projects: [] };
        }
        return await response.json();
    }

    createGraph(projects) {
        if (!projects) {
            console.error("Projects data is undefined. Cannot create graph.");
            return;
        }

        const skills = ['Design', 'Development', 'Video Editing'];
        skills.forEach(skill => {
            this.nodes.push({ id: skill, type: 'sun', isStatic: true });
        });

        projects.forEach(project => {
            this.nodes.push({ id: project.id, type: 'planet', data: project });
            project.categories.forEach(category => {
                this.links.push({ source: project.id, target: category });
            });
        });
        
        this.createThreeObjects();
    }

    createThreeObjects() {
    // --- FIX: Declare the nodeMap here before we use it ---
    const nodeMap = new Map();

    // First, loop through all nodes and create their 3D meshes
    this.nodes.forEach(node => {
        let mesh;
        if (node.type === 'sun') {
            mesh = createSun(node.id);
        } else { // Planet
            mesh = createPlanet(node.data);
        }
        mesh.userData.id = node.id;
        node.mesh = mesh;
        this.threeObjects.add(mesh);

        // Store the newly created mesh in our map with its ID as the key
        nodeMap.set(node.id, mesh);
    });

    // Now that the map is full, loop through the links to create tethers
    this.links.forEach(link => {
        // The D3 link gives us objects, so we access their IDs
        const sunId = typeof link.target === 'object' ? link.target.id : link.target;
        const planetId = typeof link.source === 'object' ? link.source.id : link.source;

        const sunMesh = nodeMap.get(sunId);
        const planetMesh = nodeMap.get(planetId);
        
        if (sunMesh && planetMesh) {
            const tether = new Tether(sunMesh, planetMesh);
            this.tethers.push(tether);
            this.scene.add(tether.mesh); // Add tether mesh directly to the scene
        }
    });
    }

    initSimulation() {
        // --- FIX 2: Call the functions using their correct, imported names ---
        this.simulation = forceSimulation(this.nodes, 3) // The '3' tells it we're in 3D
            .force('link', forceLink(this.links).id(d => d.id).strength(1.5))
            .force('charge', forceManyBody().strength(d => d.type === 'sun' ? -500 : -20))
            .force('center', forceCenter(0, 0, 0))
            .force('z_plane', forceZ(0).strength(1.0));

        const sunPositions = {
            'Design': new THREE.Vector3(-20, 10, 0),
            'Development': new THREE.Vector3(20, 10, 0),
            'Video Editing': new THREE.Vector3(0, -20, 0)
        };

        this.simulation.nodes().forEach(node => {
            if (node.isStatic) {
                const pos = sunPositions[node.id];
                if(pos) {
                    node.fx = pos.x;
                    node.fy = pos.y;
                    node.fz = pos.z;
                }
            }
        });
    }

    update(elapsedTime) {
        this.elapsedTime = elapsedTime;
        if (!this.simulation) return;

        // No need to call simulation.tick() manually, it runs automatically.
         this.threeObjects.children.forEach(obj => {
        if(obj.userData.type === 'sun') {
             obj.userData.shellMaterial.uniforms.uTime.value = this.elapsedTime;
             obj.userData.coreMaterial.uniforms.uTime.value = this.elapsedTime;
        }
    });
        this.simulation.nodes().forEach(node => {
            if (node.mesh) {
                node.mesh.position.set(node.x, node.y, node.z);
            }
        });

         this.tethers.forEach(tether => {
            tether.update(elapsedTime);
        });
    }
}