uniform vec3 uCoreColor;
uniform vec3 uCoronaColor;

varying float vFresnel;

void main() {
    // Mix the core and corona colors based on the fresnel value.
    // The center will be the core color, the edges will be the corona color.
    vec3 color = mix(uCoreColor, uCoronaColor, vFresnel);
    
    // The final pixel color. We make it more transparent towards the center.
    gl_FragColor = vec4(color, pow(vFresnel, 2.0));
}