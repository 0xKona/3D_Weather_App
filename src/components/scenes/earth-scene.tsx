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
  zoom?: number; // New prop for zoom level
}

// Function to calculate sun direction based on UTC time and current date
// This simulates the sun's position in the sky for realistic lighting
const getSunDirection = (date: Date): THREE.Vector3 => {
  // Get UTC time in hours (0-23.99)
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  
  // Convert to angle (sun rises at 6 AM UTC, sets at 6 PM UTC)
  // This creates a full day/night cycle over 24 hours
  const sunAngle = ((utcHours - 6) / 12) * Math.PI; // -π/2 to π/2
  
  // Sun direction vector (simplified - sun moves from east to west)
  // X: east-west movement, Y: up-down (day/night), Z: north-south (fixed for simplicity)
  const sunX = Math.sin(sunAngle);
  const sunY = Math.cos(sunAngle);
  const sunZ = 0; // No north-south movement for simplicity
  
  return new THREE.Vector3(sunX, sunY, sunZ).normalize();
};

// Function to calculate lighting intensity based on sun position
// This determines how bright the day side should be
const getLightingIntensity = (sunDirection: THREE.Vector3): number => {
  // Intensity based on sun's height above horizon
  // Higher sun = brighter lighting
  const intensity = Math.max(0.1, sunDirection.y); // Minimum ambient light
  return Math.min(2.0, intensity * 1.5); // Cap at 2.0 for performance
};

const EarthModel = ({ coords, onLocationSelect, manualRotation, zoom = 1 }: Props) => {
  const clickCount = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  // Refs for 3D objects
  const tiltGroupRef = useRef<THREE.Group>(null);
  const earthGroupRef = useRef<THREE.Group>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const pinpointRef = useRef<THREE.Mesh>(null);
  const sunLightRef = useRef<THREE.DirectionalLight>(null);

  // State for dynamic lighting
  const [sunDirection, setSunDirection] = useState(getSunDirection(new Date()));
  const [lightingIntensity, setLightingIntensity] = useState(getLightingIntensity(sunDirection));

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
    emissive: 0xff2222,
    emissiveIntensity: 0.5,
  }), []);

  // Convert latitude/longitude coordinates to 3D position on sphere surface
  // This is used for placing the pinpoint marker
  const latLngToVector3 = (lat: number, lng: number, radius: number = 1.005) => {
    const phi = (90 - lat) * (Math.PI / 180); // Convert latitude to angle from north pole
    const theta = (lng + 180) * (Math.PI / 180); // Convert longitude to angle, offset by 180°

    // Calculate 3D coordinates using spherical coordinates
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
  };

  // Convert 3D position back to latitude/longitude
  // This is used when user clicks on the Earth
  const vector3ToLatLng = (position: THREE.Vector3) => {
    const radius = position.length();
    const phi = Math.acos(position.y / radius); // Angle from north pole
    const lat = 90 - (phi * 180 / Math.PI);

    // Calculate longitude from x-z plane
    const theta = Math.atan2(position.z, -position.x);
    let lng = (theta * 180 / Math.PI) - 180;

    // Normalize longitude to -180 to 180 range
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;

    return { lat, lng };
  };

  // Position the pinpoint marker based on provided coordinates
  useEffect(() => {
    if (pinpointRef.current && coords && coords[0] && coords[1]) {
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);

      if (!isNaN(lat) && !isNaN(lng)) {
        const position = latLngToVector3(lat, lng);
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
      map: earthMap, // Day texture
      bumpMap: earthBump, // Surface bump mapping for terrain
      bumpScale: 0.04, // Bump intensity
      specularMap: earthSpec, // Specular highlights
      emissiveMap: earthLights, // Night lights that glow
      emissive: new THREE.Color(0x444444), // Base emissive color
      emissiveIntensity: 0.3, // Night light brightness
      shininess: 10, // Specular highlight intensity
    });
  }, [earthMap, earthBump, earthSpec, earthLights]);

  // Create clouds material - transparent layer over Earth
  const cloudsMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    map: earthClouds,
    transparent: true,
    opacity: 0.5,
  }), [earthClouds]);

  // Create atmosphere material - subtle blue glow around Earth
  const fresnelMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x0099ff,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide, // Render on inside of sphere
  }), []);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Dispose of materials
      earthMaterial.dispose();
      cloudsMaterial.dispose();
      fresnelMaterial.dispose();
      pinpointMaterial.dispose();
      
      // Dispose of geometry
      geometry.dispose();
      pinpointGeometry.dispose();
    };
  }, [earthMaterial, cloudsMaterial, fresnelMaterial, pinpointMaterial, geometry, pinpointGeometry]);

  // Set Earth's axial tilt (23.44 degrees)
  useEffect(() => {
    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.z = THREE.MathUtils.degToRad(23.44);
    }
  }, []);

  // Initialize Earth rotation to show Americas first
  useEffect(() => {
    if (earthGroupRef.current) {
      earthGroupRef.current.rotation.set(0, THREE.MathUtils.degToRad(-90), 0);
    }
  }, []);

  // Handle manual rotation from control sliders
  useEffect(() => {
    if (earthGroupRef.current && manualRotation) {
      const latRad = THREE.MathUtils.degToRad(manualRotation.lat);
      const lngRad = THREE.MathUtils.degToRad(manualRotation.lng);

      gsap.to(earthGroupRef.current.rotation, {
        x: -latRad,
        y: THREE.MathUtils.degToRad(-90) - lngRad,
        z: 0,
        duration: 0.5,
        ease: 'power2.out',
        overwrite: true,
      });
    }
  }, [manualRotation]);

  // Handle zoom level changes
  useEffect(() => {
    if (earthGroupRef.current) {
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
        const { lat, lng } = vector3ToLatLng(localPoint);

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
      const newSunDirection = getSunDirection(new Date());
      const newIntensity = getLightingIntensity(newSunDirection);
      
      setSunDirection(newSunDirection);
      setLightingIntensity(newIntensity);
    };

    // Update immediately
    updateLighting();

    // Update every minute
    const interval = setInterval(updateLighting, 60000);

    return () => clearInterval(interval);
  }, []);

  // Update sun light position and intensity
  useEffect(() => {
    if (sunLightRef.current) {
      // Position sun light far away in the direction of the sun
      sunLightRef.current.position.copy(sunDirection.multiplyScalar(10));
      sunLightRef.current.intensity = lightingIntensity;
    }
  }, [sunDirection, lightingIntensity]);

  // Cleanup animations and timers on unmount
  useEffect(() => {
    const earthGroup = earthGroupRef.current;
    
    return () => {
      // Kill GSAP animations
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
    if (earthGroupRef.current && !gsap.isTweening(earthGroupRef.current.rotation)) {
      earthGroupRef.current.rotation.y += 0.00002;
    }

    // Animate pinpoint marker (pulsing effect)
    if (pinpointRef.current && pinpointRef.current.visible) {
      const time = state.clock.getElapsedTime();
      const scale = 0.55 + Math.sin(time * 1) * 0.1;
      pinpointRef.current.scale.setScalar(scale);
    }
  });

  return (
    <>
      {/* Ambient light for overall scene illumination */}
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
          
          {/* Clouds layer */}
          <mesh 
            ref={cloudsMeshRef} 
            geometry={geometry} 
            material={cloudsMaterial} 
            scale={1.003} 
          />
          
          {/* Atmosphere glow */}
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
            visible={false} 
          />
        </group>
      </group>
    </>
  );
};

// Component to control camera position and zoom
const CameraController = ({ zoom = 1 }: { zoom?: number }) => {
  const { camera, viewport } = useThree();

  useEffect(() => {
    const radius = 1; // Earth radius
    const fovRad = THREE.MathUtils.degToRad(75); // Camera field of view
    const aspect = viewport.width / viewport.height;

    // Calculate distance needed to fit Earth in viewport
    const fovY = 2 * Math.atan(Math.tan(fovRad / 2) / aspect);
    const distanceVertical = radius / Math.sin(fovY / 2);

    const fovX = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
    const distanceHorizontal = radius / Math.sin(fovX / 2);

    // Use larger distance to ensure Earth fits
    const baseDistance = Math.max(distanceVertical, distanceHorizontal);
    
    // Apply zoom by adjusting distance
    const distance = baseDistance / zoom;

    camera.position.set(0, 0, distance);
    camera.updateProjectionMatrix();
  }, [camera, viewport, zoom]);

  return null;
};

const EarthScene = ({ coords, onLocationSelect, manualRotation, zoom = 1 }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle WebGL context loss for robustness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (event: Event) => {
      console.warn('WebGL context lost. Preventing default behavior.');
      event.preventDefault();
    };

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
        preserveDrawingBuffer: true,
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
      <CameraController zoom={zoom} />
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
