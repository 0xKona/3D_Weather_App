/**
 * Fragment shader for Earth rendering
 * Handles day/night transitions and lighting effects based on sun position
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
        
        // Get the direction from world center to this vertex (normalized)
        // This effectively gives us the direction vector pointing from
        // the center of the Earth to this point on the surface,
        // which is what we need for the day/night calculation
        vec3 worldDirectionToSurface = normalize(vWorldPosition);
        
        // Use world normal for lighting - this makes lighting independent of Earth rotation
        vec3 worldNormal = normalize(vWorldNormal);
        
        // Calculate if this point is facing the sun using world coordinates
        // This makes the lighting independent of Earth's rotation
        float sunDot = dot(worldNormal, normalize(sunDirection));
        
        // Enhance the night lights - make them brighter and slightly colored
        vec3 enhancedNightColor = nightColor * vec3(1.5, 1.2, 1.0) * 2.5;
        
        // Create smooth transition between day and night with wider transition zone
        float mixFactor = smoothstep(-0.15, 0.15, sunDot);
        
        // Calculate specular reflection on water
        float specularIntensity = 0.0;
        if (sunDot > 0.0) {
            // Only calculate specular on day side
            vec3 viewDirection = normalize(-vPosition);
            vec3 halfVector = normalize(viewDirection + sunDirection);
            float specularFactor = max(0.0, dot(worldNormal, halfVector));
            
            // Higher power for sharper specular highlight
            specularIntensity = pow(specularFactor, 50.0) * specularColor.r * 2.0;
        }
        
        // Enhance day colors slightly
        vec3 enhancedDayColor = dayColor * (1.0 + 0.3 * max(0.0, sunDot));
        
        // Mix day and night textures based on sun position
        vec3 baseColor = mix(enhancedNightColor, enhancedDayColor, mixFactor);
        
        // Add ambient light to both day and night sides
        baseColor += dayColor * 0.15; 
        
        // Add specular highlight
        baseColor += specularIntensity * vec3(0.9, 0.9, 1.0);
        
        // Final color with full opacity (1.0)
        gl_FragColor = vec4(baseColor, 1.0);
    }
`