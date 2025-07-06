uniform float uTime;
// New uniforms for animation
uniform float uHelixRadius; 
uniform float uHelixSpeed;
uniform float uPulseTime; // Value from 0 to 1 to control the pulse

// aProgress is the particle's position along the line (0 at sun, 1 at planet)
attribute float aProgress; 
varying float vProgress;

void main() {
    vProgress = aProgress;
    vec3 basePosition = position;

    // --- Helix Logic ---
    // The angle of the particle around the helix line
    float angle = aProgress * 20.0 + uTime * uHelixSpeed;
    // Calculate the x/y offset from the center line
    float x = cos(angle) * uHelixRadius;
    float y = sin(angle) * uHelixRadius;
    
    // Create an offset vector and apply it
    vec3 offset = vec3(x, y, 0.0);
    vec3 newPosition = basePosition + offset;
    
    // --- Pulse Logic ---
    // A simple pulse is a bright spot that travels along the tether.
    // smoothstep creates a soft falloff for the pulse.
    float pulse = smoothstep(uPulseTime - 0.1, uPulseTime, aProgress) - smoothstep(uPulseTime, uPulseTime + 0.1, aProgress);
    
    // --- Point Size ---
    // Make particles smaller at the ends and larger for the pulse
    gl_PointSize = (1.0 - abs(aProgress - 0.5) * 2.0) * 5.0;
    gl_PointSize += pulse * 10.0; // Pulse makes points bigger

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}