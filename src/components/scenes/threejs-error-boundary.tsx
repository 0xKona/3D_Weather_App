'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ThreeJSErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ThreeJSErrorBoundary extends React.Component<
  ThreeJSErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ThreeJSErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Check if it's a WebGL-related error
    const isWebGLError = 
      error.message.includes('WebGL') ||
      error.message.includes('Context Lost') ||
      error.message.includes('THREE') ||
      error.message.includes('canvas');

    return {
      hasError: isWebGLError,
      error: isWebGLError ? error : undefined,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ThreeJS Error Boundary caught an error:', error, errorInfo);
    
    // In development, automatically retry after a short delay
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        this.setState({ hasError: false, error: undefined });
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-pulse text-gray-600">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-300 rounded-full"></div>
                <p>3D graphics loading...</p>
                {process.env.NODE_ENV === 'development' && (
                  <p className="text-sm text-gray-500 mt-2">
                    WebGL context is being restored
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
