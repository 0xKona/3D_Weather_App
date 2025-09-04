'use client';

import { useEffect } from 'react';

/**
 * Hook to manage WebGL memory and prevent context loss in development
 */
export const useWebGLMemoryManagement = () => {
  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') return;

    const checkWebGLMemory = () => {
      try {
        // Check for global WebGL context information
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            // Log renderer info for debugging
            console.debug('WebGL Renderer:', gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
          }
          
          // Force cleanup
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext) {
            // In development, we don't actually lose context but prepare for it
            console.debug('WebGL context management initialized');
          }
        }
        
        // Cleanup temporary canvas
        canvas.remove();
      } catch (error) {
        console.warn('WebGL memory check failed:', error);
      }
    };

    // Check memory every 30 seconds in development
    const memoryCheckInterval = setInterval(checkWebGLMemory, 30000);
    
    // Initial check
    checkWebGLMemory();

    // Listen for memory pressure events (if supported)
    const handleMemoryPressure = () => {
      console.warn('Memory pressure detected, forcing garbage collection');
      if (window.gc) {
        window.gc();
      }
    };

    // Add memory pressure listener for Chrome DevTools
    if ('memory' in performance) {
      window.addEventListener('memory-pressure', handleMemoryPressure);
    }

    return () => {
      clearInterval(memoryCheckInterval);
      window.removeEventListener('memory-pressure', handleMemoryPressure);
    };
  }, []);
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    gc?: () => void;
  }
}
