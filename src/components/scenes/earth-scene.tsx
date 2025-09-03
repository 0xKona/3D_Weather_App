'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { vertexShader } from '../shaders/vertex';
import { fragmentShader } from '../shaders/fragment';
import gsap from 'gsap';

interface Props {
  coords: [string, string];
  onLocationSelect?: (lat: number, lng: number) => void;
  manualRotation?: { lat: number; lng: number };
}

// Function to calculate sun direction based on UTC time
const getSunDirection = (date: Date): THREE.Vector3 => {
  // Get UTC time in hours (0-23.99)
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  
  // Convert to angle (sun rises at 6 AM UTC, sets at 6 PM UTC)
  const sunAngle = ((utcHours - 6) / 12) * Math.PI; // -π/2 to π/2
  
  // Sun direction vector (simplified - sun moves from east to west)
  const sunX = Math.sin(sunAngle);
  const sunY = Math.cos(sunAngle);
  const sunZ = 0; // No north-south movement for simplicity
  
  return new THREE.Vector3(sunX, sunY, sunZ).normalize();
};

const EarthModel = ({ coords, onLocationSelect, manualRotation }: Props) => {
  const clickCount = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  const tiltGroupRef = useRef<THREE.Group>(null);
  const earthGroupRef = useRef<THREE.Group>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const pinpointRef = useRef<THREE.Mesh>(null);

  const [sunDirection, setSunDirection] = useState(getSunDirection(new Date()));

  // Load textures
  const earthMap = useLoader(THREE.TextureLoader, './textures/8081_earthmap10k.jpg');
  const earthSpec = useLoader(THREE.TextureLoader, './textures/8081_earthspec10k.jpg');
  const earthBump = useLoader(THREE.TextureLoader, './textures/8081_earthbump10k.jpg');
  const earthLights = useLoader(THREE.TextureLoader, './textures/8081_earthlights10k.jpg');
  const earthClouds = useLoader(THREE.TextureLoader, './textures/clouds_map.jpg');

  // Enhance texture quality
  useEffect(() => {
    const textures = [earthMap, earthSpec, earthBump, earthLights];
    textures.forEach(texture => {
      texture.anisotropy = 16;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = true;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    });
  }, [earthMap, earthSpec, earthBump, earthLights, earthClouds]);

  // Create pinpoint geometry and material
  const pinpointGeometry = useMemo(() => new THREE.SphereGeometry(0.015, 16, 16), []);
  const pinpointMaterial = useMemo(() => new THREE.MeshLambertMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.9,
    emissive: 0xff2222,
    emissiveIntensity: 0.5,
  }), []);

  // Function to convert lat/lng to 3D position on sphere
  const latLngToVector3 = (lat: number, lng: number, radius: number = 1.005) => {
    const phi = (90 - lat) * (Math.PI / 180); // latitude angle from north pole
    const theta = (lng + 180) * (Math.PI / 180); // longitude angle, offset by 180°

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
  };

  // Function to convert 3D position to lat/lng
  const vector3ToLatLng = (position: THREE.Vector3) => {
    const radius = position.length();
    const phi = Math.acos(position.y / radius); // angle from north pole
    const lat = 90 - (phi * 180 / Math.PI);

    // Calculate theta from x-z plane
    const theta = Math.atan2(position.z, -position.x); // angle in x-z plane

    // Convert theta back to longitude
    let lng = (theta * 180 / Math.PI) - 180;

    // Normalize to -180 to 180
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;

    return { lat, lng };
  };

  // Position pinpoint based on coordinates
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

  const geometry = new THREE.SphereGeometry(1, 128, 96);

  const earthMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: earthMap },
      nightTexture: { value: earthLights },
      specularMap: { value: earthSpec },
      bumpMap: { value: earthBump },
      bumpScale: { value: 0.04 },
      sunDirection: { value: sunDirection },
      emissionStrength: { value: 0.8 },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
  }), [earthMap, earthLights, earthSpec, earthBump, sunDirection]);

  const cloudsMaterial = new THREE.MeshBasicMaterial({
    map: earthClouds,
    transparent: true,
    opacity: 0.5,
  });

  const fresnelMaterial = new THREE.MeshBasicMaterial({
    color: 0x0099ff,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide,
  });

  // Set Earth's axial tilt
  useEffect(() => {
    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.z = THREE.MathUtils.degToRad(23.44);
    }
  }, []);

  // Initialize with default rotation
  useEffect(() => {
    if (earthGroupRef.current) {
      earthGroupRef.current.rotation.set(0, THREE.MathUtils.degToRad(-90), 0);
    }
  }, []);

  // Handle manual rotation from sliders
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
  // Handle mouse events for double-click
  const handlePointerDown = (event: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    event.stopPropagation();

    const point = event.point;
    if (point && earthMeshRef.current) {
      clickCount.current += 1;

      if (clickCount.current === 1) {
        clickTimer.current = setTimeout(() => {
          clickCount.current = 0;
        }, 300); // Double-click threshold
      } else if (clickCount.current === 2) {
        if (clickTimer.current) {
          clearTimeout(clickTimer.current);
        }
        clickCount.current = 0;

        // Transform the world point to local coordinates of the earth mesh
        const localPoint = earthMeshRef.current.worldToLocal(point.clone());

        // Get lat/lng from the local intersection point
        const { lat, lng } = vector3ToLatLng(localPoint);

        console.log('Double-clicked location:', lat, lng, 'World point:', point, 'Local point:', localPoint);

        // Call the callback to update location
        if (onLocationSelect) {
          onLocationSelect(lat, lng);
        }
      }
    }
  };

  // Update sun direction every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setSunDirection(getSunDirection(new Date()));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Update shader uniform when sun direction changes
  useEffect(() => {
    if (earthMaterial.uniforms.sunDirection) {
      earthMaterial.uniforms.sunDirection.value = sunDirection;
    }
  }, [sunDirection, earthMaterial]);

    // Animate clouds and pinpoint
  useFrame((state) => {
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.rotation.y += 0.00005;
    }

    // Only auto-rotate if not currently animating to a location
    if (earthGroupRef.current && !gsap.isTweening(earthGroupRef.current.rotation)) {
      // Very slow auto-rotation
      earthGroupRef.current.rotation.y += 0.00002;
    }

    if (pinpointRef.current && pinpointRef.current.visible) {
      const time = state.clock.getElapsedTime();
      const scale = 0.55 + Math.sin(time * 1) * 0.1;
      pinpointRef.current.scale.setScalar(scale);
    }
  });  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 8, 0]} intensity={5} />
      <group ref={tiltGroupRef}>
        <group ref={earthGroupRef}>
          <mesh
            ref={earthMeshRef}
            geometry={geometry}
            material={earthMaterial}
            onPointerDown={handlePointerDown}
          />
          <mesh ref={cloudsMeshRef} geometry={geometry} material={cloudsMaterial} scale={1.003} />
          <mesh geometry={geometry} material={fresnelMaterial} scale={1.01} />
          <mesh ref={pinpointRef} geometry={pinpointGeometry} material={pinpointMaterial} visible={false} />
        </group>
      </group>
    </>
  );
};

const EarthScene = ({ coords, onLocationSelect, manualRotation }: Props) => {

  return (
    <Canvas
      camera={{ position: [0, 0, 2], fov: 75 }}
      className="w-full h-full"
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.5,
      }}
    >
      <EarthModel coords={coords} onLocationSelect={onLocationSelect} manualRotation={manualRotation} />
    </Canvas>
  );
};

export default EarthScene;
