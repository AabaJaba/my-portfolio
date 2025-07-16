// src/components/Planet.js (Updated)
import * as THREE from 'three';

// This function is perfect and remains unchanged.
function getProjectColor(categories) {
    const colorMap = {
        'Design': new THREE.Color(1, 0, 0),
        'Development': new THREE.Color(0, 0, 1),
        'Video Editing': new THREE.Color(0, 1, 0)
    };
    
    const finalColor = new THREE.Color(0, 0, 0);
    let count = 0;
    
    categories.forEach(cat => {
        if (colorMap[cat]) {
            finalColor.add(colorMap[cat]);
            count++;
        }
    });

    if (count > 1) {
        finalColor.multiplyScalar(1 / count); // Average the colors
    }
    
    if (count === 3) return new THREE.Color(0.9, 0.9, 0.9);

    return finalColor;
}

export function createPlanet(projectData) {
    const radius = projectData.size || 1.5;
    const geometry = new THREE.IcosahedronGeometry(radius, 5);
    
    // The noisy blob shape is a great visual, we'll keep it.
    const positionAttribute = geometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        const noise = 0.1 * Math.random(); // Simple noise
        vertex.normalize().multiplyScalar(radius + noise);
        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();
    
    // --- FIX: Replaced the transparent material with a solid one ---
    const material = new THREE.MeshStandardMaterial({
        color: getProjectColor(projectData.categories),
        metalness: 0.2,  // Gives a slight metallic sheen
        roughness: 0.5   // Creates a satin, non-glossy surface
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.id = projectData.id;
    mesh.userData.type = 'planet';
    mesh.layers.set(1);
    
    return mesh;
}