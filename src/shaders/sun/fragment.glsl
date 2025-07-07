uniform vec3 uCoreColor;
uniform vec3 uCoronaColor;
uniform sampler2D uNoiseTexture; // The new texture uniform
uniform float uTime;

varying float vFresnel;

void main() {
    // Sample the noise texture, making it scroll over time
    vec2 scrollingUv = gl_PointCoord + vec2(uTime * 0.05, 0.0);
    float noise = texture2D(uNoiseTexture, scrollingUv).r;
    
    // Mix the core and corona colors based on the fresnel
    vec3 color = mix(uCoreColor, uCoronaColor, vFresnel);
    
    // Add the noise to the color to create bright "hotspots"
    color += noise * 0.2;

    // --- THE FIX for the hollow look ---
    // Instead of fading to 0 alpha, we fade to a minimum opacity.
    // This gives a base opacity of 0.1 (10%) at the center, "plugging the hole".
    float alpha = 0.1 + vFresnel * 0.9;
    
    gl_FragColor = vec4(color, alpha);
}