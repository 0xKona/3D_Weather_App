'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface WebGLContextType {
  isContextLost: boolean;
  restoreContext: () => void;
}

const WebGLContext = createContext<WebGLContextType>({
  isContextLost: false,
  restoreContext: () => {},
});

export const useWebGL = () => useContext(WebGLContext);

interface WebGLProviderProps {
  children: React.ReactNode;
}

export const WebGLProvider: React.FC<WebGLProviderProps> = ({ children }) => {
  const [isContextLost, setIsContextLost] = useState(false);
  const restoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const restoreContext = () => {
    // Clear any existing timeout
    if (restoreTimeoutRef.current) {
      clearTimeout(restoreTimeoutRef.current);
    }

    // Set a timeout to restore context after a brief delay
    restoreTimeoutRef.current = setTimeout(() => {
      setIsContextLost(false);
    }, 100);
  };

  useEffect(() => {
    const handleGlobalContextLoss = () => {
      console.warn('Global WebGL context loss detected');
      setIsContextLost(true);
      restoreContext();
    };

    // Listen for global WebGL context loss
    window.addEventListener('webglcontextlost', handleGlobalContextLoss);

    // Cleanup
    return () => {
      window.removeEventListener('webglcontextlost', handleGlobalContextLoss);
      if (restoreTimeoutRef.current) {
        clearTimeout(restoreTimeoutRef.current);
      }
    };
  }, []);

  // Don't render children during context loss
  if (isContextLost) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Restoring 3D graphics...</p>
        </div>
      </div>
    );
  }

  return (
    <WebGLContext.Provider value={{ isContextLost, restoreContext }}>
      {children}
    </WebGLContext.Provider>
  );
};
