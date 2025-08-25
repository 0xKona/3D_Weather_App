/**
 * This shader allows the transition between night an day, allowing the smooth transitions
 * that turn the lights on as the earth rotates into night
 */
export const fragmentShader = `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform sampler2D specularMap;
    uniform vec3 sunDirection;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = texture2D(nightTexture, vUv).rgb;
    
    // Calculate lighting based on sun direction
    float sunDot = dot(vNormal, sunDirection);
    float lightIntensity = max(0.0, sunDot);
    
    // Create smooth transition between day and night
    float mixFactor = smoothstep(-0.1, 0.1, sunDot);
    
    // Mix day and night textures based on lighting
    vec3 color = mix(nightColor * 2.0, dayColor, mixFactor);
    
    // Add some ambient light so night side isn't completely black
    color += dayColor * 0.25; // Increase from 0.1 to 0.25
    
    gl_FragColor = vec4(color, 1.0);
    }
`