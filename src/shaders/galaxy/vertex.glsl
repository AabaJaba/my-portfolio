uniform float uSize;
uniform float uTime;
uniform float uMaxSize;
uniform float uRadius; // We need the galaxy's radius for the calculation

varying vec3 vColor;
varying float vDistanceToCamera;

void main() {
    vColor = color;
    
    // --- DIFFERENTIAL ROTATION LOGIC ---
    // This logic is a direct GLSL implementation of the example's 'animateSpin' loop.
    
    // 1. Get the particle's original position on the X-Z plane.
    vec2 pos = vec2(position.x, position.z);
    
    // 2. Calculate its distance from the center (0,0).
    float distance = length(pos);
    
    // 3. Create a master rotation angle that changes over time.
    // This creates the "lag" effect.
    float spinVariation = sin(uTime * 0.01) * 0.5;
    
    // 4. Calculate the specific rotation angle for THIS particle.
    // The farther the particle is from the center, the more it's affected by the spin.
    float angle = spinVariation * (distance / uRadius) * 2.0;
    
    // 5. Create a 2D rotation matrix.
    mat2 rotationMatrix = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    
    // 6. Apply the rotation to the particle's X-Z position.
    vec2 rotatedPosition = rotationMatrix * pos;
    
    // 7. Create the final displaced position, keeping the original Y.
    vec3 displacedPosition = vec3(rotatedPosition.x, position.y, rotatedPosition.y);

    // --- The rest of the shader is the same, but uses `displacedPosition` ---
    
    vec4 modelPosition = modelMatrix * vec4(displacedPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;

    vDistanceToCamera = -viewPosition.z;
    float perspectiveSize = uSize * (300.0 / -viewPosition.z);
    gl_PointSize = min(perspectiveSize, uMaxSize);
    
    gl_Position = projectionMatrix * viewPosition;
}