uniform float uTime;
uniform float uBrightness;

varying vec2 vUv;

// A simple noise function to create wispy textures
float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    // Create rotating, distorted UVs for a swirling effect
    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
    float dist = distance(vUv, vec2(0.5));
    
    vec2 distortedUv = vec2(dist, angle/3.14159 + uTime * 0.1);
    
    // Create wispy bands using noise and sine waves
    float noise = random(distortedUv * 5.0);
    float bands = sin(distortedUv.y * 20.0 + noise * 5.0);
    
    // Increase contrast and clamp the value
    bands = pow(bands, 3.0);
    bands = clamp(bands, 0.0, 1.0);
    
    // Add some soft edges
    float edgeFalloff = smoothstep(0.0, 0.1, dist) * (1.0 - smoothstep(0.45, 0.5, dist));
    
    float alpha = bands * edgeFalloff * uBrightness;

    gl_FragColor = vec4(vec3(1.0), alpha); // White color
}