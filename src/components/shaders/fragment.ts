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
        
        // Enhance the night lights - reduce brightness to prevent transparency issues
        vec3 enhancedNightColor = nightColor * vec3(1.2, 1.1, 1.0) * 1.5;
        
        // Create smooth transition between day and night with wider transition zone
        float mixFactor = smoothstep(-0.15, 0.15, sunDot);
        
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
        
        // Enhance day colors slightly - reduce enhancement to prevent over-brightness
        vec3 enhancedDayColor = dayColor * (1.0 + 0.2 * max(0.0, sunDot));
        
        // Mix day and night textures based on sun position
        vec3 baseColor = mix(enhancedNightColor, enhancedDayColor, mixFactor);
        
        // Add ambient light to both day and night sides - reduce to prevent over-brightness
        baseColor += dayColor * 0.1; 
        
        // Add specular highlight
        baseColor += specularIntensity * vec3(0.9, 0.9, 1.0);
        
        // Clamp colors to prevent over-brightness which could cause transparency issues
        baseColor = clamp(baseColor, 0.0, 1.0);
        
        // Final color with full opacity (1.0) - explicitly set alpha to prevent transparency
        gl_FragColor = vec4(baseColor, 1.0);
    }
`