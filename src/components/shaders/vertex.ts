/**
 * Vertex shader for Earth rendering
 * Handles position calculation and passes normal, UV and position data to fragment shader
 */
export const vertexShader = `
    // Input uniforms
    uniform vec3 sunDirection;
    
    // Outputs to fragment shader
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;
    
    void main() {
        // Pass UV coordinates for texture mapping
        vUv = uv;
        
        // Calculate and normalize normal vector
        vNormal = normalize(normal);
        
        // Calculate world normal for lighting calculations
        // This transforms the normal from model space to world space
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        
        // Pass position for additional calculations
        vPosition = position;
        
        // Calculate world position for world-space lighting
        // This is critical for maintaining consistent lighting during rotation
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        // Set final vertex position
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`