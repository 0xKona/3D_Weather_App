'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const EarthModel = () => {
  const earthGroupRef = useRef<THREE.Group>(null);
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const lightsMeshRef = useRef<THREE.Mesh>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);

  // Load textures
  const earthMap = useLoader(THREE.TextureLoader, './textures/8081_earthmap10k.jpg');
  const earthSpec = useLoader(THREE.TextureLoader, './textures/8081_earthspec10k.jpg');
  const earthBump = useLoader(THREE.TextureLoader, './textures/8081_earthbump10k.jpg');
  const earthLights = useLoader(THREE.TextureLoader, './textures/8081_earthlights10k.jpg');
  const earthClouds = useLoader(THREE.TextureLoader, './textures/clouds_map.jpg');

  // Create geometry
  const detail = 12;
  const geometry = new THREE.IcosahedronGeometry(1, detail);

  // Create materials
  const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthMap,
    specularMap: earthSpec,
    bumpMap: earthBump,
    bumpScale: 0.04,
  });

  const lightsMaterial = new THREE.MeshBasicMaterial({
    map: earthLights,
    blending: THREE.AdditiveBlending,
  });

  const cloudsMaterial = new THREE.MeshStandardMaterial({
    map: earthClouds,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });

  // Simple fresnel material (you'll need to implement getFresnelMat or use a basic material)
  const fresnelMaterial = new THREE.MeshBasicMaterial({
    color: 0x0099ff,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide,
  });

  // Create starfield
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
  
  const starsVertices = [];
  for (let i = 0; i < 2000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starsVertices.push(x, y, z);
  }
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));

  // Animation loop
  useFrame(() => {
    if (earthMeshRef.current) earthMeshRef.current.rotation.y += 0.002;
    if (lightsMeshRef.current) lightsMeshRef.current.rotation.y += 0.002;
    if (cloudsMeshRef.current) cloudsMeshRef.current.rotation.y += 0.0023;
    if (glowMeshRef.current) glowMeshRef.current.rotation.y += 0.002;
    if (starsRef.current) starsRef.current.rotation.y -= 0.0002;
  });

  return (
    <>
      {/* Starfield */}
      <points ref={starsRef} geometry={starsGeometry} material={starsMaterial} />
      
      {/* Directional light (sun) */}
      <directionalLight position={[-2, 0.5, 1.5]} intensity={2.0} />
      
      {/* Earth group */}
      <group ref={earthGroupRef} rotation={[0, 0, -23.4 * Math.PI / 180]}>
        {/* Earth mesh */}
        <mesh ref={earthMeshRef} geometry={geometry} material={earthMaterial} />
        
        {/* Lights mesh */}
        <mesh ref={lightsMeshRef} geometry={geometry} material={lightsMaterial} />
        
        {/* Clouds mesh */}
        <mesh ref={cloudsMeshRef} geometry={geometry} material={cloudsMaterial} scale={1.003} />
        
        {/* Glow mesh */}
        <mesh ref={glowMeshRef} geometry={geometry} material={fresnelMaterial} scale={1.01} />
      </group>
    </>
  );
};

const EarthScene = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden"
      style={{ width: '100vw', height: '100vh', position: 'absolute' }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.LinearSRGBColorSpace,
      }}
    >
      <OrbitControls />
      <EarthModel />
    </Canvas>
  );
};

export default EarthScene;
