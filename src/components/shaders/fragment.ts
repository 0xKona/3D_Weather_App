/**
 * Fragment shader for the Earth scene.
 *
 * Samples day/night/specular/bump textures and blends them using
 * the normalized `sunDirection` to produce a smooth, readable
 * day/night terminator. Outputs an opaque RGB color; clouds and
 * atmosphere are separate layers.
 *
 * Uniforms: dayTexture, nightTexture, specularMap, bumpMap, sunDirection, bumpScale
 *
 * Notes:
 * - Terminator: smoothstep blend softens the day/night edge; widen/narrow smoothstep to tweak.
 * - Night: nightTexture amplified + small ambient lift so features stay readable without losing lights.
 * - Specular: only on lit hemisphere (water glint); lower power if highlights are harsh.
 * - Perf: favors clarity over physical accuracy; avoid heavy per-fragment work.
 * - Integration: shader outputs alpha=1.0; use separate materials for translucency (clouds/atmosphere).
 */
export const fragmentShader = `
    // Input textures
    uniform sampler2D dayTexture;    // Earth daytime texture
    uniform sampler2D nightTexture;  // Earth nighttime lights texture
    uniform sampler2D specularMap;   // Specular map (water reflection)
    uniform sampler2D bumpMap;       // Terrain bump map
    
    // Sun position for lighting calculation
    uniform vec3 sunDirection;
    uniform float bumpScale;
    
    // Inputs from vertex shader
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;
    
    void main() {
        // Sample all textures
        vec3 dayColor = texture2D(dayTexture, vUv).rgb;
        vec3 nightColor = texture2D(nightTexture, vUv).rgb;
        vec3 specularColor = texture2D(specularMap, vUv).rgb;
        
        // Calculate longitude from UV coordinates (equirectangular projection)
        // UV.x goes from 0 to 1, representing longitude from -180° to +180°
        // UV.y goes from 0 to 1, representing latitude from +90° to -90°
        float longitude = (vUv.x - 0.5) * 2.0 * 3.14159265359; // Convert to radians: -π to +π
        float latitude = (0.5 - vUv.y) * 3.14159265359;        // Convert to radians: +π/2 to -π/2
        
        // Calculate the surface normal at this point on the sphere
        vec3 surfaceNormal = vec3(
            cos(latitude) * cos(longitude),  // X component
            sin(latitude),                   // Y component  
            cos(latitude) * sin(longitude)   // Z component
        );
        
        // Calculate if this point is facing the sun
        float sunDot = dot(surfaceNormal, normalize(sunDirection));
        
    // Enhance the night lights so city lights are visible without overexposing
    vec3 enhancedNightColor = nightColor * vec3(1.2, 1.1, 1.0) * 1.8;

    // Create a smoother, wider transition between day and night so the
    // terminator isn't harsh. This helps both visibility and realism.
    float mixFactor = smoothstep(-0.25, 0.25, sunDot);
        
        // Calculate specular reflection on water
        float specularIntensity = 0.0;
        if (sunDot > 0.0) {
            // Only calculate specular on day side
            vec3 viewDirection = normalize(-vPosition);
            vec3 halfVector = normalize(viewDirection + sunDirection);
            // Use surface normal for specular calculation
            float specularFactor = max(0.0, dot(surfaceNormal, halfVector));
            
            // Higher power for sharper specular highlight - reduce intensity
            specularIntensity = pow(specularFactor, 50.0) * specularColor.r * 1.0;
        }
        
    // Enhance day colors subtly — smaller multiplier so bright areas
    // don't wash out detail.
    vec3 enhancedDayColor = dayColor * (1.0 + 0.12 * max(0.0, sunDot));
        
        // Mix day and night textures based on sun position
        vec3 baseColor = mix(enhancedNightColor, enhancedDayColor, mixFactor);
        
    // Add a small ambient term on the day side to lift midtones (kept small)
    baseColor += dayColor * 0.06;

    // Add specular highlight (reduced intensity to avoid blown highlights)
    baseColor += specularIntensity * 0.6 * vec3(0.9, 0.9, 1.0);

    // Add a subtle ambient lift on the night side so land/ocean features
    // remain visible without losing the night lights effect.
    float nightFactor = 1.0 - mixFactor;
    baseColor += vec3(0.04) * nightFactor;
        
        // Clamp colors to prevent over-brightness which could cause transparency issues
        baseColor = clamp(baseColor, 0.0, 1.0);
        
        // Final color with full opacity (1.0) - explicitly set alpha to prevent transparency
        gl_FragColor = vec4(baseColor, 1.0);
    }
`