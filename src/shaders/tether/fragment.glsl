uniform vec3 uColor;
varying float vProgress;

void main() {
    // This creates a soft, circular dot instead of a square.
    float dist = distance(gl_PointCoord, vec2(0.5));
    float strength = 1.0 - dist * 2.0;

    // Make the particles slightly more transparent towards the planet.
    float alpha = strength * (1.0 - vProgress * 0.5);

    gl_FragColor = vec4(uColor, alpha);
}