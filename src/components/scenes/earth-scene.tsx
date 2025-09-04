'use client';

import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';

interface Props {
  coords: [string, string];
  onLocationSelect?: (lat: number, lng: number) => void;
  manualRotation?: { lat: number; lng: number };
  zoom?: number; // Controls the zoom level of the earth
}

/**
 * Utility functions for Earth scene
 */
// Helper functions for lighting and coordinates
const EarthUtils = {
  /**
   * Calculates sun direction vector based on current UTC time
   * This simulates the sun's position for realistic day/night lighting
   * 
   * @param date - Current date/time
   * @returns THREE.Vector3 representing normalized sun direction
   */
  getSunDirection: (date: Date): THREE.Vector3 => {
    // Get UTC time in hours (0-23.99)
    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    
    // Convert to angle (sun rises at 6 AM UTC, sets at 6 PM UTC)
    const sunAngle = ((utcHours - 6) / 12) * Math.PI;
    
    // Sun direction vector - models east to west movement
    const sunX = Math.sin(sunAngle);
    const sunY = Math.cos(sunAngle);
    
    return new THREE.Vector3(sunX, sunY, 0).normalize();
  },

  /**
   * Calculates appropriate lighting intensity based on sun position
   * 
   * @param sunDirection - The current sun direction vector
   * @returns number representing light intensity
   */
  getLightingIntensity: (sunDirection: THREE.Vector3): number => {
    // Intensity based on sun's height above horizon (Y component)
    // Ensures minimum ambient light at night, maximum during day
    const intensity = Math.max(0.1, sunDirection.y);
    return Math.min(2.0, intensity * 1.5);
  },

  /**
   * Converts lat/lng coordinates to 3D position on a sphere
   * 
   * @param lat - Latitude in degrees
   * @param lng - Longitude in degrees
   * @param radius - Radius of sphere (slightly larger than 1 for pinpoint placement)
   * @returns THREE.Vector3 position
   */
  latLngToVector3: (lat: number, lng: number, radius: number = 1.005): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180); // Convert latitude to angle from north pole
    const theta = (lng + 180) * (Math.PI / 180); // Convert longitude to angle, offset by 180°

    // Calculate 3D coordinates using spherical coordinates
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
  },

  /**
   * Converts 3D position to lat/lng coordinates
   * Used when user clicks on Earth to select a location
   * 
   * @param position - 3D position vector
   * @returns {lat, lng} coordinates in degrees
   */
  vector3ToLatLng: (position: THREE.Vector3) => {
    const radius = position.length();
    const phi = Math.acos(position.y / radius);
    const lat = 90 - (phi * 180 / Math.PI);

    // Calculate longitude from x-z plane
    const theta = Math.atan2(position.z, -position.x);
    let lng = (theta * 180 / Math.PI) - 180;

    // Normalize longitude to -180 to 180 range
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;

    return { lat, lng };
  }
};

/**
 * EarthModel component - The core 3D Earth representation
 * Handles:
 * - Earth rendering with textures
 * - Location pinpointing
 * - Day/night cycle simulation
 * - Interactive rotation and zoom
 */
const EarthModel = ({ coords, onLocationSelect, manualRotation, zoom = 1 }: Props) => {
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

  // Create Earth material using standard Three.js materials instead of shaders
  // This provides day/night lighting without custom shaders
  const earthMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      map: earthMap, // Day texture (color)
      bumpMap: earthBump, // Surface bump mapping for terrain
      bumpScale: 0.04, // Bump intensity - subtle terrain effect
      specularMap: earthSpec, // Controls shininess of water vs land
      emissiveMap: earthLights, // Night lights texture (city lights)
      emissive: new THREE.Color(0x444444), // Base emissive color (night side base color)
      emissiveIntensity: 0.3, // Night light brightness
      shininess: 10, // Specular highlight intensity (water reflections)
    });
  }, [earthMap, earthBump, earthSpec, earthLights]);

  // Create clouds material - transparent layer over Earth
  const cloudsMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    map: earthClouds,
    transparent: true,
    opacity: 0.5, // Semi-transparent clouds
  }), [earthClouds]);

  // Create atmosphere material - subtle blue glow around Earth
  const fresnelMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x0099ff,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide, // Render on inside of sphere for glow effect
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
      // Calculate new sun direction and lighting intensity based on current time
      const newSunDirection = EarthUtils.getSunDirection(new Date());
      const newIntensity = EarthUtils.getLightingIntensity(newSunDirection);
      
      setSunDirection(newSunDirection);
      setLightingIntensity(newIntensity);
    };

    // Update immediately on mount
    updateLighting();

    // Update every minute to keep lighting in sync with real time
    const interval = setInterval(updateLighting, 60000);

    return () => clearInterval(interval);
  }, []);

  // Update sun light position and intensity whenever they change
  useEffect(() => {
    if (sunLightRef.current) {
      // Position sun light far away in the direction of the sun
      // This creates realistic day/night terminator
      const position = sunDirection.clone().multiplyScalar(10);
      sunLightRef.current.position.copy(position);
      sunLightRef.current.intensity = lightingIntensity;
    }
  }, [sunDirection, lightingIntensity]);

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
      {/* Ambient light for overall scene illumination - ensures dark side isn't completely black */}
      <ambientLight intensity={0.3} />
      
      {/* Directional sun light that moves with time */}
      <directionalLight 
        ref={sunLightRef}
        position={[0, 0, 0]} // Will be updated by useEffect
        intensity={1} // Will be updated by useEffect
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

// Component to control camera position and zoom
const CameraController = ({ zoom = 1 }: { zoom?: number }) => {
  const { camera, viewport } = useThree();

  // Update camera position based on zoom level
  useEffect(() => {
    // Parameters for camera positioning
    const radius = 1; // Earth radius
    const fovRad = THREE.MathUtils.degToRad(75); // Camera field of view in radians
    const aspect = viewport.width / viewport.height;

    // Calculate vertical and horizontal distances needed to fit Earth in viewport
    // This ensures Earth fits regardless of viewport aspect ratio
    const fovY = 2 * Math.atan(Math.tan(fovRad / 2) / aspect);
    const distanceVertical = radius / Math.sin(fovY / 2);

    const fovX = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
    const distanceHorizontal = radius / Math.sin(fovX / 2);

    // Use larger distance to ensure Earth fits
    const baseDistance = Math.max(distanceVertical, distanceHorizontal);
    
    // Apply zoom by adjusting distance - higher zoom = closer camera
    const distance = baseDistance / zoom;

    // Animate camera position for smooth zoom
    gsap.to(camera.position, {
      z: distance,
      duration: 0.5,
      ease: 'power2.out',
    });
    
    camera.updateProjectionMatrix();
  }, [camera, viewport, zoom]);

  return null;
};

/**
 * Main Earth Scene component
 * Renders a 3D Earth globe with interactive features:
 * - Dynamic day/night lighting based on current time
 * - Pinpoint marker for selected location
 * - Interactive rotation and zoom controls
 * - Location selection via double-clicking
 */
const EarthScene = ({ coords, onLocationSelect, manualRotation, zoom = 1 }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle WebGL context loss for robustness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prevent default behavior when context is lost to enable recovery
    const handleContextLost = (event: Event) => {
      console.warn('WebGL context lost. Preventing default behavior.');
      event.preventDefault();
    };

    // Handle context restoration
    const handleContextRestored = () => {
      console.log('WebGL context restored.');
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);

  return (
    <Canvas
      ref={canvasRef}
      camera={{ fov: 75 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.5,
        preserveDrawingBuffer: true, // Enables taking screenshots
        powerPreference: "high-performance",
        alpha: true,
        premultipliedAlpha: false,
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        // Additional WebGL settings for development
        gl.debug.checkShaderErrors = process.env.NODE_ENV === 'development';
      }}
    >
      {/* Camera controller manages viewing distance based on zoom level */}
      <CameraController zoom={zoom} />
      
      {/* Earth model with all interactive features */}
      <EarthModel 
        coords={coords} 
        onLocationSelect={onLocationSelect} 
        manualRotation={manualRotation}
        zoom={zoom}
      />
    </Canvas>
  );
};

export default EarthScene;
