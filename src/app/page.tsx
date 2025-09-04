'use client'

import EarthScene from "@/components/scenes/earth-scene";
import LocationInput from "@/components/location-search.tsx/location-input";
import { useSearchParams, useRouter } from "next/navigation";
import React, { Suspense } from "react";
import { getWeatherByLocation } from "../utils/api";
import { CurrentWeatherResponse } from "@/types/current-weather";
import WeatherDisplay from "@/components/weather-display.tsx/display";
import StarsScene from "@/components/scenes/stars";
import EarthControls from "@/components/scenes/earth-controls";
import { EarthView } from "@/types/manual-rotation";
import Footer from "@/components/footer/footer";
import { WebGLProvider } from "@/components/scenes/webgl-provider";
import { ThreeJSErrorBoundary } from "@/components/scenes/threejs-error-boundary";
import { useWebGLMemoryManagement } from "@/hooks/useWebGLMemoryManagement";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // WebGL memory management hook for development
  useWebGLMemoryManagement();

  // Check if location param exists, if not redirect to default
  React.useEffect(() => {
    if (!searchParams.get('location')) {
      router.replace('/?location=London');
    }
  }, [searchParams, router]);

  // derive location directly from search params (default fallback)
  const locationQuery = searchParams.get('location') ?? 'London';

  // data / loading / error state
  const [data, setData] = React.useState<CurrentWeatherResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [coords, setCoords] = React.useState<[string, string]>(['0', '0'])

  // Manual rotation state for lat/lng sliders
  const [manualRotation, setManualRotation] = React.useState<EarthView>({ lat: 0, lng: 0 })

  // Handle location selection from earth double-click
  const handleLocationSelect = (lat: number, lng: number) => {
    const newLocation = `${lat},${lng}`;
    router.push(`/?location=${encodeURIComponent(newLocation)}`);
  };

  // fetch when locationQuery changes; use AbortController to avoid races
  React.useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getWeatherByLocation(locationQuery, { signal });
        if (signal.aborted) return;
        setCoords([result.location.lat.toString(), result.location.lon.toString()])
        setData(result);
      } catch (err) {
        if (signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setData(null);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    load();
    return () => {
      controller.abort();
    };
  }, [locationQuery]);

  // Update manual rotation sliders when coordinates change
  React.useEffect(() => {
    if (coords[0] && coords[1]) {
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        // Clamp latitude to slider range (-45 to 45)
        const clampedLat = -Math.max(-45, Math.min(45, lat));
        // Longitude can be any value (-180 to 180), but we'll keep it within that range
        const clampedLng = ((lng + 180) % 360) - 180;
        
        setManualRotation({ lat: clampedLat, lng: clampedLng });
      }
    }
  }, [coords]);

  return (
    <WebGLProvider>
      <div className="font-sans relative min-h-screen w-full">
        {/* Stars background - lowest z-index, covering whole page */}
        <ThreeJSErrorBoundary>
          <StarsScene />
        </ThreeJSErrorBoundary>
        
        {/* Location Input for mobile - at top */}
        <div className="w-full flex justify-center md:hidden p-2">
          <LocationInput />
        </div>
      
      {/* Main grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-10 min-h-screen relative p-2 z-10">
        {/* Weather Display - full width on mobile, left column on desktop */}
        <div className="col-span-1 md:col-span-5 lg:col-span-5 xl:col-span-4">
          <WeatherDisplay data={data} loading={loading} error={error} />
        </div>
      
        {/* Earth scene and controls - hidden on mobile/tablet, right columns on desktop */}
        <div className="col-span-1 md:col-span-5 lg:col-span-5 relative hidden md:block md:mr-15 xl:mr-0">
          {/* Location Input for desktop - part of earth scene area */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 w-[75%] flex justify-center pt-16">
            <LocationInput />
          </div>
          
          {/* Earth scene */}
          <div className="absolute inset-0 xl:pt-[100px]">
            <ThreeJSErrorBoundary>
              <EarthScene coords={coords} onLocationSelect={handleLocationSelect} manualRotation={manualRotation}/>
            </ThreeJSErrorBoundary>
          </div>
          
          {/* Manual rotation controls */}
          <EarthControls 
            manualRotation={manualRotation}
            setManualRotation={setManualRotation}
          />
          
          {/* Loading and error messages */}
          {loading && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">Loading weather for {locationQuery}…</div>}
          {error && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 text-red-500">Error: {error}</div>}
        </div>
      </div>
      </div>
      <Footer />
    </WebGLProvider>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
