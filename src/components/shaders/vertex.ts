/**
 * Vertex shader for the Earth scene.
 *
 * Responsibilities:
 * - Provide interpolated data to the fragment shader (uv, normals, positions).
 * - Compute world-space normal and position for lighting calculations.
 *
 * Uniforms: sunDirection
 * Varyings: vNormal, vPosition, vUv, vWorldNormal, vWorldPosition
 *
 * Quick defs:
 * - Uniforms: read-only values supplied from JS per draw (same for all verts/frags). e.g. `sunDirection`.
 * - Attributes: per-vertex inputs provided by the mesh (position, normal, uv).
 * - Varyings: values the vertex shader outputs and that are interpolated across the
 *   primitive for the fragment shader (e.g. `vUv`, `vWorldNormal`).
 *
 * Notes:
 * - Keep vertex work minimal: transforms only, no expensive per-vertex math.
 * - vWorldNormal is computed via modelMatrix to ensure correct lighting when the globe rotates.
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