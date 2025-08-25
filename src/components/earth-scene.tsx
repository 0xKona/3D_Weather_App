'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { vertexShader } from './shaders/vertex';
import { fragmentShader } from './shaders/fragment';
import gsap from 'gsap';

interface Props {
  coords: [string, string];
}

const EarthModel = ({ coords }: Props) => {
  const sunDir: [number, number, number] = [10, 8, 0];

  const tiltGroupRef = useRef<THREE.Group>(null);
  const earthGroupRef = useRef<THREE.Group>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);

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

  // Create stars geometry and material
  const starsGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.8,
  });

  // Create starfield with different sized stars for depth
  useEffect(() => {
    const starsVertices = [];
    const starsColors = [];
    const starsSizes = [];
    
    for (let i = 0; i < 15000; i++) {
      // Create stars in a large sphere around the scene
      const radius = 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      starsVertices.push(x, y, z);
      
      // Vary star colors slightly (white to blue-white)
      const colorVariation = 0.7 + Math.random() * 0.3;
      starsColors.push(colorVariation, colorVariation, 1.0);
      
      // Vary star sizes for depth effect
      starsSizes.push(Math.random() * 2 + 0.5);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starsColors, 3));
    starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starsSizes, 1));
  }, [starsGeometry]);

  const geometry = new THREE.SphereGeometry(1, 128, 96);

  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: earthMap },
      nightTexture: { value: earthLights },
      specularMap: { value: earthSpec },
      bumpMap: { value: earthBump },
      bumpScale: { value: 0.04 },
      sunDirection: { value: new THREE.Vector3(...sunDir).normalize() },
      emissionStrength: { value: 0.8 }, // Add emission strength control
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
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

  // Set Earth's axial tilt (Real is 23.44)
  useEffect(() => {
    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.z = THREE.MathUtils.degToRad(15);
    }
  }, []);

  // Initialize with default rotation to show Greenwich at (0,0)
  useEffect(() => {
    if (earthGroupRef.current) {
      // Default rotation to show Greenwich (0°, 0°) at center
      // The texture has Americas at center by default, rotation needed to show Greenwich
      earthGroupRef.current.rotation.set(0, THREE.MathUtils.degToRad(-90), 0);
    }
  }, []);

  // Handle coordinate-based positioning - always rotate from the default Greenwich position
  useEffect(() => {
    if (earthGroupRef.current && coords && coords[0] && coords[1]) {
      const lat = -parseFloat(coords[0]);
      const lng = -parseFloat(coords[1]);
      
      // Only process valid coordinates
      if (!isNaN(lat) && !isNaN(lng)) {
        // Convert to radians
        const latRad = THREE.MathUtils.degToRad(lat);
        const lngRad = THREE.MathUtils.degToRad(lng);

        // Calculate absolute rotation from Greenwich reference
        // Start from Greenwich position (-90° Y rotation) and adjust
        const baseRotationY = THREE.MathUtils.degToRad(-90);
        const finalRotationY = baseRotationY - lngRad; // Subtract longitude to rotate east
        const finalRotationX = -latRad; // Negative latitude to tilt north up

        // Animate to the new rotation
        gsap.to(earthGroupRef.current.rotation, {
          x: finalRotationX,
          y: finalRotationY,
          z: 0,
          duration: 1.5,
          ease: 'power2.inOut',
          // Ensure GSAP always animates to the new target
          overwrite: true, 
        });
      }
    }
  }, [coords]);

  // Animate clouds and stars
  useFrame(() => {
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.rotation.y += 0.00005;
    }
    // Slowly rotate stars for subtle movement
    if (starsRef.current) {
      starsRef.current.rotation.x += 0.0001;
      starsRef.current.rotation.y += 0.0002;
    }
  });

  return (
    <>
      {/* Starfield background */}
      <points ref={starsRef} geometry={starsGeometry} material={starsMaterial} />
      
      <ambientLight intensity={0.8} />
      <directionalLight position={sunDir} intensity={5} />
      {/* Axial tilt group - applied first */}
      <group ref={tiltGroupRef}>
        {/* Earth rotation group - rotates around tilted axis */}
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
        toneMappingExposure: 0.5,
      }}
    >
      <EarthModel coords={coords} />
    </Canvas>
  );
};

export default EarthScene;