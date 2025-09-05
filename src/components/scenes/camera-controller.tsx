'use client';

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

// Component to control camera position and zoom
export default function CameraController({ zoom = 1 }: { zoom?: number }) {
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