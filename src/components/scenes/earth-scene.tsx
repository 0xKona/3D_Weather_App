'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import EarthModel, { EarthSceneProps } from './earth-model';
import CameraController from './camera-controller';

/**
 * Main Earth Scene component
 * Renders a 3D Earth globe with interactive features:
 * - Dynamic day/night lighting based on current time
 * - Pinpoint marker for selected location
 * - Interactive rotation and zoom controls
 * - Location selection via double-clicking
 */
export default function EarthScene({ coords, onLocationSelect, manualRotation, zoom = 1 }: EarthSceneProps) {
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
      // Ensure the canvas element itself is CSS-transparent so page content shows through
      style={{ background: 'transparent' }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.5,
        preserveDrawingBuffer: true, // Enables taking screenshots
        powerPreference: "high-performance",
        // Keep the canvas transparent so the page background shows through.
        // Cloud and atmosphere materials are tuned to avoid tinting the oceans.
        alpha: true,
        premultipliedAlpha: false,
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        // Additional WebGL settings for development
        gl.debug.checkShaderErrors = process.env.NODE_ENV === 'development';
        // Make sure the GL clear color has zero alpha so cleared pixels are transparent
        // (prevents the default black clear color from showing through)
        try {
          gl.setClearColor(new THREE.Color(0x000000), 0);
        } catch {
          // Some contexts may not expose setClearColor; fall back to clearAlpha
          if (typeof gl.clear === 'function') {
            // @ts-expect-error - depending on the renderer binding
            gl.clearColor(0, 0, 0, 0);
          }
        }
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
