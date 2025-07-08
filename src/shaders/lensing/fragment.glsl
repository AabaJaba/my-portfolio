// This uniform is automatically provided by the EffectComposer
uniform sampler2D tDiffuse; 

// These are our custom uniforms
uniform vec2 uScreenCenter; // The black hole's position on the screen (0.0 to 1.0)
uniform float uLensingRadius; // How far the lensing effect extends
uniform float uLensingStrength; // How much the light is bent

varying vec2 vUv;

void main() {
    // Calculate vector from current pixel to the screen center
    vec2 toCenter = uScreenCenter - vUv;
    float dist = length(toCenter);

    // If the pixel is outside the lensing radius, draw it normally
    if (dist > uLensingRadius) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
    }

    // --- Lensing Calculation ---
    // The distortion is strongest near the edge of the hole and weaker further out
    // The pow() function creates a sharp falloff
    float distortion = pow(dist / uLensingRadius, 2.0);
    distortion *= uLensingStrength;

    // Calculate the new UV coordinates by pulling them towards the center
    vec2 distortedUv = vUv + toCenter * distortion;
    
    // Sample the original scene texture at the new, distorted coordinates
    vec4 color = texture2D(tDiffuse, distortedUv);

    gl_FragColor = color;
}