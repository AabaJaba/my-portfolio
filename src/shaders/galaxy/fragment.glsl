uniform float uFadeInDistance; // Our new uniform for fading
varying vec3 vColor;
varying float vDistanceToCamera;

void main() {
    // --- THE FIX for Additive Blending ---
    // Calculate a fade-out factor based on camera distance.
    // It will be 0 when very close, and 1 when farther away.
    float fade = smoothstep(uFadeInDistance, uFadeInDistance + 2.0, vDistanceToCamera);

    // Create a soft, circular point
    float dist = distance(gl_PointCoord, vec2(0.5));
    if (dist > 0.5) discard;

    // Multiply the final color by our fade factor.
    gl_FragColor = vec4(vColor, fade);
}