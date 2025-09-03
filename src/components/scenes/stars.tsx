import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";

import * as THREE from 'three';

function Stars() {
  const starsRef = useRef<THREE.Points>(null);

  // Create stars geometry and material
  const starsGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const starsMaterial = useMemo(() => new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.8,
  }), []);

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

  useFrame(() => {
    // Slowly rotate stars for subtle movement
    if (starsRef.current) {
      starsRef.current.rotation.x += 0.0001;
      starsRef.current.rotation.y += 0.0002;
    }
  });

  return <points ref={starsRef} geometry={starsGeometry} material={starsMaterial} />;
}

export default function StarsScene() {
  return (
    <Canvas
      className="absolute top-0 left-0 w-full h-full"
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0
      }}
      camera={{ position: [0, 0, 1], fov: 75 }}
    >
      <Stars />
    </Canvas>
  );
}