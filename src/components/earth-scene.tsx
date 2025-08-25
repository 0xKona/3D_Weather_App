'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import gsap from 'gsap';

interface Props {
  coords: [string, string];
}

function latLngToRotation(lat: number, lng: number) {
  // Use latitude and longitude in the correct order
  const y = -lng * (Math.PI / 180); // Y axis: longitude
  const x = -(lat - 90) * (Math.PI / 180); // X axis: latitude
  return { x, y };
}

const EarthModel = ({ coords }: Props) => {

  const sunDir: [number, number, number] = [7, 5, 0];

  const tiltGroupRef = useRef<THREE.Group>(null);
  const earthGroupRef = useRef<THREE.Group>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);
  const earthMeshRef = useRef<THREE.Mesh>(null);

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
      // Set anisotropic filtering for sharper textures at angles
      texture.anisotropy = 16; // Maximum supported by most GPUs
      
      // Use highest quality filtering
      texture.magFilter = THREE.LinearFilter; // For when texture is larger than screen pixels
      texture.minFilter = THREE.LinearMipmapLinearFilter; // For when texture is smaller than screen pixels
      texture.colorSpace = THREE.SRGBColorSpace;
      // Generate mipmaps for better quality at different distances
      texture.generateMipmaps = true;
      // Wrap mode (prevents edge bleeding)
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    });
  }, [earthMap, earthSpec, earthBump, earthLights, earthClouds]);

  // Create geometry with higher detail
  const detail = 40;
  const geometry = new THREE.IcosahedronGeometry(1, detail);

  // Create custom earth material with day/night lighting
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: earthMap },
      nightTexture: { value: earthLights },
      specularMap: { value: earthSpec },
      bumpMap: { value: earthBump },
      bumpScale: { value: 0.04 },
      sunDirection: { value: new THREE.Vector3(...sunDir).normalize() },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      
      uniform float bumpScale;
      uniform sampler2D bumpMap;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
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
        color += dayColor * 0.1;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

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

  // Set Earth's real axial tilt once (23.44 degrees)
  useEffect(() => {
    if (tiltGroupRef.current) {
      // Earth's actual axial tilt is 23.44 degrees
      tiltGroupRef.current.rotation.z = 23.44 * Math.PI / 180;
    }
  }, []);

  // Animate rotation when coords change (only affects earthGroup, not tilt)
  useEffect(() => {
    if (
      earthGroupRef.current &&
      coords &&
      coords[0] &&
      coords[1] &&
      !isNaN(Number(coords[0])) &&
      !isNaN(Number(coords[1]))
    ) {
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);
      const { x, y } = latLngToRotation(lat, lng);

      // Animate rotation using GSAP (only on earthGroup, tilt remains locked)
      gsap.to(earthGroupRef.current.rotation, {
        x,
        y,
        z: 0, // No additional tilt here - tilt is handled by parent group
        duration: 1.5,
        ease: 'power2.inOut',
      });
    }
  }, [coords]);

  // Animate clouds only
  useFrame(() => {
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.rotation.y += 0.00005;
    }
  });

  return (
    <>
      {/* Ambient light for general illumination */}
      <ambientLight intensity={0.1} />
      {/* Directional light (sun) */}
      <directionalLight position={sunDir} intensity={5.0} />
      {/* Earth's axial tilt group - LOCKED, never changes */}
      <group ref={tiltGroupRef}>
        {/* Earth rotation group - rotates based on coordinates */}
        <group ref={earthGroupRef}>
          <mesh ref={earthMeshRef} geometry={geometry} material={earthMaterial} />
          <mesh ref={cloudsMeshRef} geometry={geometry} material={cloudsMaterial} scale={1.003} />
          <mesh geometry={geometry} material={fresnelMaterial} scale={1.01} />
        </group>
      </group>
    </>
  );
};

const EarthScene = ({ coords }: Props) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 2], fov: 75 }}
      className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden"
      style={{ width: '100vw', height: '100vh', position: 'absolute' }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.LinearSRGBColorSpace,
      }}
    >
      <OrbitControls 
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={1.5}
        maxDistance={5}
        // Lock vertical rotation - only allow horizontal rotation
        minPolarAngle={Math.PI * 0.5} // 90 degrees (horizontal)
        maxPolarAngle={Math.PI * 0.5} // 90 degrees (horizontal)
      />
      <EarthModel coords={coords} />
    </Canvas>
  );
};

export default EarthScene;
