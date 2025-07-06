uniform vec3 uColor;
uniform float uBrightness; // New uniform for brightness
varying float vProgress;

void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));
    float strength = 1.0 - dist * 2.0;
    if (strength < 0.0) discard; // Discard pixels outside the circle

    // Fade particles at the very beginning and end
    float alpha = smoothstep(0.0, 0.1, vProgress) * (1.0 - smoothstep(0.9, 1.0, vProgress));

    gl_FragColor = vec4(uColor, strength * alpha * uBrightness);
}