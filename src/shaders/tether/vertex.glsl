uniform float uTime;
// This attribute will be 0 at the sun and 1 at the planet for each particle.
attribute float aProgress; 

varying float vProgress;

void main() {
    vProgress = aProgress;

    // A simple sine wave to make the tether gently undulate.
    // The wave is smaller at the ends (near the sun/planet).
    float wave = sin(aProgress * 3.14159) * sin(aProgress * 5.0 + uTime * 0.5) * 0.5;

    // We pass the final position from our JS file.
    vec3 newPosition = position;
    newPosition.z += wave; // Apply the wave on the z-axis for depth

    // Make the tether thicker in the middle and thinner at the ends.
    // The pow() function creates a more dramatic curve.
    gl_PointSize = (1.0 - abs(aProgress - 0.5) * 2.0) * 15.0;
    gl_PointSize *= pow(vProgress, 0.3); // Taper towards the sun

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}