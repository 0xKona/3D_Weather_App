'use client'

import { useFrame, useLoader } from '@react-three/fiber';
import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { vertexShader } from '../shaders/vertex';
import { fragmentShader } from '../shaders/fragment';
import EarthUtils from './scene-utils/earth-utils';

export interface EarthSceneProps {
  coords: [string, string];
  onLocationSelect?: (lat: number, lng: number) => void;
  manualRotation?: { lat: number; lng: number };
  zoom?: number; // Controls the zoom level of the earth
}

/**
 * EarthModel component - The core 3D Earth representation
 * Handles:
 * - Earth rendering with textures
 * - Location pinpointing
 * - Day/night cycle simulation
 * - Interactive rotation and zoom
 */
export default function EarthModel({ coords, onLocationSelect, manualRotation, zoom = 1 }: EarthSceneProps) {
  // Click detection variables
  const clickCount = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  // Refs for 3D objects
  const tiltGroupRef = useRef<THREE.Group>(null);
  const earthGroupRef = useRef<THREE.Group>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const pinpointRef = useRef<THREE.Mesh>(null);
  const sunLightRef = useRef<THREE.DirectionalLight>(null);

  // State for dynamic lighting based on time of day
  const [sunDirection, setSunDirection] = useState(EarthUtils.getSunDirection(new Date()));
  const [lightingIntensity, setLightingIntensity] = useState(EarthUtils.getLightingIntensity(sunDirection));

  // Load textures for Earth appearance
  const earthMap = useLoader(THREE.TextureLoader, './textures/8081_earthmap10k.jpg');
  const earthSpec = useLoader(THREE.TextureLoader, './textures/8081_earthspec10k.jpg');
  const earthBump = useLoader(THREE.TextureLoader, './textures/8081_earthbump10k.jpg');
  const earthLights = useLoader(THREE.TextureLoader, './textures/8081_earthlights10k.jpg');
  const earthClouds = useLoader(THREE.TextureLoader, './textures/clouds_map.jpg');

  // Optimize texture settings for better performance and quality
  useEffect(() => {
    const textures = [earthMap, earthSpec, earthBump, earthLights, earthClouds];
    textures.forEach(texture => {
      texture.anisotropy = 16; // Improve texture quality at angles
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = true;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    });

    // Cleanup function to prevent memory leaks
    return () => {
      textures.forEach(texture => {
        texture.dispose();
      });
    };
  }, [earthMap, earthSpec, earthBump, earthLights, earthClouds]);

  // Create pinpoint geometry and material for location markers
  const pinpointGeometry = useMemo(() => new THREE.SphereGeometry(0.015, 16, 16), []);
  const pinpointMaterial = useMemo(() => new THREE.MeshLambertMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.9,
    emissive: 0xff2222, // Makes pinpoint glow
    emissiveIntensity: 0.5,
  }), []);

  // Position the pinpoint marker based on provided coordinates
  useEffect(() => {
    if (pinpointRef.current && coords && coords[0] && coords[1]) {
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);

      if (!isNaN(lat) && !isNaN(lng)) {
        const position = EarthUtils.latLngToVector3(lat, lng);
        pinpointRef.current.position.copy(position);
        pinpointRef.current.visible = true;
      }
    }
  }, [coords]);

  // Create Earth geometry - sphere with high detail for smooth appearance
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 128, 96), []);

  // Create custom Earth material with shaders for realistic day/night transition
  const earthMaterial = useMemo(() => {
    // Ensure all textures are properly loaded before creating material
    if (!earthMap || !earthLights || !earthSpec || !earthBump) {
      // Return a placeholder material if textures aren't loaded
      return new THREE.MeshBasicMaterial({ color: 0x5566aa });
    }
    
    // ShaderMaterial gives full control over the rendering process
    const material = new THREE.ShaderMaterial({
      uniforms: {
        // Day texture (land and oceans)
        dayTexture: { value: earthMap },
        // Night texture (city lights)
        nightTexture: { value: earthLights },
        // Surface detail map for specular highlights
        specularMap: { value: earthSpec },
        // Bump map for terrain elevation
        bumpMap: { value: earthBump },
        // Sun direction for lighting calculations - will be updated via uniform
        sunDirection: { value: new THREE.Vector3(1, 0, 0) }, // Default direction
        // Bump scale for terrain detail
        bumpScale: { value: 0.04 },
      },
      // Vertex shader handles the basic 3D transforms and passes lighting data
      vertexShader: vertexShader,
      // Fragment shader handles the complex day/night blending
      fragmentShader: fragmentShader,
      // Additional properties for proper rendering
      transparent: false, // Earth should be fully opaque
      alphaTest: 0, // No alpha testing needed for opaque material
      opacity: 1.0, // Explicitly set full opacity
      side: THREE.FrontSide,
      // Set depth testing and writing for correct rendering
      depthTest: true,
      depthWrite: true,
      // Ensure proper blending for opaque material
      blending: THREE.NormalBlending,
      // Prevent any premultiplied alpha issues
      premultipliedAlpha: false,
    });
    
    console.log("Earth material created");
    
    return material;
  }, [earthMap, earthLights, earthSpec, earthBump]); // Removed sunDirection from dependencies

  // Create clouds material - transparent layer over Earth
  // Using MeshBasicMaterial for clouds to ensure they're always visible
  // regardless of lighting, since real clouds are self-illuminating/diffusing
  const cloudsMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    map: earthClouds,
    transparent: true,
  opacity: 0.45, // Slightly reduced cloud opacity to avoid heavy overlay
  // Increase alphaTest to remove very faint cloud fragments which can
  // cause visible translucency artifacts around the oceans.
  alphaTest: 0.1,
  // Use normal blending and enable depth writes so clouds occlude
  // correctly and don't make the Earth appear translucent.
  blending: THREE.NormalBlending,
  depthWrite: true,
    side: THREE.FrontSide,
  }), [earthClouds]);

  // Create atmosphere material - subtle blue glow around Earth
  // Using MeshPhongMaterial for better control over the glow effect
  const fresnelMaterial = useMemo(() => new THREE.MeshPhongMaterial({
  color: 0x3388ff,
  transparent: true,
  // Much lower opacity and additive blending so the atmosphere brightens
  // the rim without darkening or tinting the Earth's surface.
  opacity: 0.06,
  side: THREE.BackSide, // Render on inside of sphere for glow effect
  shininess: 100,
  emissive: new THREE.Color(0x1155aa),
  emissiveIntensity: 0.25,
  depthWrite: false, // Prevents z-fighting with the Earth
  blending: THREE.AdditiveBlending,
  }), []);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Dispose of all materials
      earthMaterial.dispose();
      cloudsMaterial.dispose();
      fresnelMaterial.dispose();
      pinpointMaterial.dispose();
      
      // Dispose of geometry
      geometry.dispose();
      pinpointGeometry.dispose();
    };
  }, [earthMaterial, cloudsMaterial, fresnelMaterial, pinpointMaterial, geometry, pinpointGeometry]);

  // Set Earth's axial tilt (23.44 degrees) - creates realistic seasonal lighting
  useEffect(() => {
    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.z = THREE.MathUtils.degToRad(23.44);
    }
  }, []);

  // Initialize Earth rotation to show Americas by default
  useEffect(() => {
    if (earthGroupRef.current) {
      earthGroupRef.current.rotation.set(0, THREE.MathUtils.degToRad(-90), 0);
    }
  }, []);

  // Handle manual rotation from control sliders
  useEffect(() => {
    if (earthGroupRef.current && manualRotation) {
      // Convert degrees to radians
      const latRad = THREE.MathUtils.degToRad(manualRotation.lat);
      const lngRad = THREE.MathUtils.degToRad(manualRotation.lng);

      // Animate rotation with GSAP for smooth transitions
      gsap.to(earthGroupRef.current.rotation, {
        x: -latRad, // Negative because we're rotating the earth, not the camera
        y: THREE.MathUtils.degToRad(-90) - lngRad, // Offset from initial position
        z: 0,
        duration: 0.5,
        ease: 'power2.out', // Ease-out for natural motion
        overwrite: true, // Prevent conflicting animations
      });
    }
  }, [manualRotation]);

  // Handle zoom level changes
  useEffect(() => {
    if (earthGroupRef.current) {
      // Use scale for zoom effect on the earth object
      gsap.to(earthGroupRef.current.scale, {
        x: zoom,
        y: zoom,
        z: zoom,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, [zoom]);

  // Handle mouse events for location selection (double-click)
  const handlePointerDown = (event: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    event.stopPropagation();

    const point = event.point;
    if (point && earthMeshRef.current) {
      clickCount.current += 1;

      if (clickCount.current === 1) {
        // Single click - start timer for double-click detection
        clickTimer.current = setTimeout(() => {
          clickCount.current = 0;
        }, 300); // 300ms double-click threshold
      } else if (clickCount.current === 2) {
        // Double click detected
        if (clickTimer.current) {
          clearTimeout(clickTimer.current);
        }
        clickCount.current = 0;

        // Convert world click position to local Earth coordinates
        const localPoint = earthMeshRef.current.worldToLocal(point.clone());

        // Convert 3D position to lat/lng
        const { lat, lng } = EarthUtils.vector3ToLatLng(localPoint);

        console.log('Selected location:', lat, lng);

        // Notify parent component of location selection
        if (onLocationSelect) {
          onLocationSelect(lat, lng);
        }
      }
    }
  };

  // Update sun direction and lighting periodically
  useEffect(() => {
    const updateLighting = () => {
      // Get current time
      const now = new Date();
      
      // Calculate new sun direction and lighting intensity based on current time
      const newSunDirection = EarthUtils.getSunDirection(now);
      const newIntensity = EarthUtils.getLightingIntensity(newSunDirection);
      
      // Update state to trigger re-renders
      setSunDirection(newSunDirection);
      setLightingIntensity(newIntensity);
      
      // Log for debugging (can be removed in production)
      console.log(`Sun updated: ${now.toUTCString()}, UTC Hours: ${now.getUTCHours()}, Direction:`, 
                  newSunDirection.toArray(), 
                  `Intensity: ${newIntensity.toFixed(2)}`);
    };

    // Update immediately on mount
    updateLighting();

    // Update more frequently for smoother transitions (every 20 seconds)
    // This creates more gradual lighting changes as time progresses
    const interval = setInterval(updateLighting, 20000);

    return () => clearInterval(interval);
  }, []);

  // Update sun light position and intensity whenever they change
  useEffect(() => {
    // Update the sun light for general scene illumination
    if (sunLightRef.current) {
      // Position sun light in world space (not relative to Earth)
      // This ensures lighting direction is maintained when Earth rotates
      const position = sunDirection.clone().multiplyScalar(100);
      sunLightRef.current.position.copy(position);
      sunLightRef.current.intensity = lightingIntensity;
      
      // Make sun light look at the origin (center of Earth)
      // This ensures the light rays are always directed at the Earth
      sunLightRef.current.lookAt(0, 0, 0);
      
      // Update light color - keep it consistent since shader handles day/night
      // We use a neutral daylight color since the shader will handle the transitions
      const lightColor = new THREE.Color().setHSL(
        0.1, // Slight warm hue
        0.3, // Low saturation for natural light
        0.7 // Good brightness level
      );
      sunLightRef.current.color = lightColor;
    }
    
      // Update the shader uniforms with the new sun direction
    // This is critical for the day/night transition in the shader
    if (earthMaterial instanceof THREE.ShaderMaterial && earthMaterial.uniforms) {
      // Make sure we provide a fresh copy of the sunDirection vector
      // This ensures the shader gets the updated value
      earthMaterial.uniforms.sunDirection.value.copy(sunDirection);
      
      // Log the current sun direction being sent to shader
      console.log("Updated shader sun direction:", 
                  earthMaterial.uniforms.sunDirection.value.toArray());
    }
    
  }, [sunDirection, lightingIntensity, earthMaterial]);

  // Cleanup animations and timers on unmount
  useEffect(() => {
    const earthGroup = earthGroupRef.current;
    
    return () => {
      // Kill GSAP animations to prevent memory leaks
      if (earthGroup?.rotation) {
        gsap.killTweensOf(earthGroup.rotation);
      }
      if (earthGroup?.scale) {
        gsap.killTweensOf(earthGroup.scale);
      }
      
      // Clear timers
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
      }
    };
  }, []);

  // Animation loop for continuous effects
  useFrame((state) => {
    // Rotate clouds slowly for realistic weather movement
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.rotation.y += 0.00005;
    }

    // Auto-rotate Earth when not being manually controlled
    // Creates subtle movement when the globe is idle
    if (earthGroupRef.current && !gsap.isTweening(earthGroupRef.current.rotation)) {
      earthGroupRef.current.rotation.y += 0.00002;
    }

    // Animate pinpoint marker (pulsing effect)
    // Makes the location marker more noticeable
    if (pinpointRef.current && pinpointRef.current.visible) {
      const time = state.clock.getElapsedTime();
      const scale = 0.55 + Math.sin(time * 1) * 0.1;
      pinpointRef.current.scale.setScalar(scale);
    }
  });

  return (
    <>
  {/* Minimal ambient light for overall scene illumination */}
  {/* Earth lighting is primarily handled by the shader */}
  <ambientLight intensity={0.14} color={new THREE.Color(0x303040)} />
      
      {/* Main directional sun light that moves with time */}
      {/* This mostly affects clouds and atmosphere */}
      <directionalLight 
        ref={sunLightRef}
        position={[0, 100, 0]} // Initial position - will be updated by useEffect
        intensity={1.0} // Initial intensity - will be updated by useEffect
        color={new THREE.Color(0xffffee)}
        castShadow={false} // Disable shadows for performance
      />
      
      {/* Earth group with axial tilt */}
      <group ref={tiltGroupRef}>
        <group ref={earthGroupRef}>
          {/* Main Earth mesh */}
          <mesh
            ref={earthMeshRef}
            geometry={geometry}
            material={earthMaterial}
            onPointerDown={handlePointerDown}
            castShadow={false}
            receiveShadow={false}
          />
          
          {/* Clouds layer - slightly larger than Earth */}
          <mesh 
            ref={cloudsMeshRef} 
            geometry={geometry} 
            material={cloudsMaterial} 
            scale={1.003} 
          />
          
          {/* Atmosphere glow - creates blue halo effect */}
          <mesh 
            geometry={geometry} 
            material={fresnelMaterial} 
            scale={1.01} 
          />
          
          {/* Location pinpoint marker */}
          <mesh 
            ref={pinpointRef} 
            geometry={pinpointGeometry} 
            material={pinpointMaterial} 
            visible={false} // Hidden by default until coordinates are provided
          />
        </group>
      </group>
    </>
  );
};