uniform float uSize;
uniform float uTime;
uniform float uMaxSize;
uniform float uRadius;

// --- START: Added new uniform for wave control ---
uniform float uWaveStrength; // Controlled from JS (e.g., 0.0 to 1.0)
// --- END: Added new uniform ---

varying vec3 vColor;
varying float vDistanceToCamera;

void main() {
    vColor = color;
    
    // --- DIFFERENTIAL ROTATION LOGIC (Unchanged) ---
    vec2 pos = vec2(position.x, position.z);
    float distance = length(pos);
    float spinVariation = sin(uTime * 0.01) * 0.5;
    float angle = spinVariation * (distance / uRadius) * 2.0;
    mat2 rotationMatrix = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 rotatedPosition = rotationMatrix * pos;
    vec3 displacedPosition = vec3(rotatedPosition.x, position.y, rotatedPosition.y);

    // --- START: New Gravitational Ripple Logic ---
    float waveFrequency = 0.5;   // How many waves from center to edge
    float waveSpeed = 2.0;       // How fast the waves travel outwards
    float waveAmplitude = 1.5;   // The max height of the wave

    // Calculate a sine wave based on the particle's distance from the center and the elapsed time.
    // The result is a Y-axis offset.
    float yOffset = sin(distance * waveFrequency - uTime * waveSpeed) * waveAmplitude * uWaveStrength;
    
    // Apply the offset to the particle's Y position.
    displacedPosition.y += yOffset;
    // --- END: New Gravitational Ripple Logic ---

    
    // --- The rest of the shader is the same, but uses the newly displaced position ---
    vec4 modelPosition = modelMatrix * vec4(displacedPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;

    vDistanceToCamera = -viewPosition.z;
    float perspectiveSize = uSize * (300.0 / -viewPosition.z);
    gl_PointSize = min(perspectiveSize, uMaxSize);
    
    gl_Position = projectionMatrix * viewPosition;
}