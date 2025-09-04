import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";

import * as THREE from 'three';

function Stars() {
  const starsRef = useRef<THREE.Points>(null);

  // Create stars geometry and material with useMemo for stability
  const { starsGeometry, starsMaterial } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.8,
    });

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
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(starsColors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(starsSizes, 1));

    return { starsGeometry: geometry, starsMaterial: material };
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      starsGeometry.dispose();
      starsMaterial.dispose();
    };
  }, [starsGeometry, starsMaterial]);

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle WebGL context loss for stars scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (event: Event) => {
      console.warn('Stars WebGL context lost. Preventing default behavior.');
      event.preventDefault();
    };

    const handleContextRestored = () => {
      console.log('Stars WebGL context restored.');
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
      gl={{
        antialias: false, // Disable antialias for background stars for performance
        preserveDrawingBuffer: false,
        powerPreference: "default",
        alpha: true,
        premultipliedAlpha: false,
        stencil: false,
        depth: false, // Stars don't need depth testing
      }}
    >
      <Stars />
    </Canvas>
  );
}