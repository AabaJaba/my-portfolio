varying vec2 vUv;

void main() {
    // Pass the UV coordinates to the fragment shader
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}