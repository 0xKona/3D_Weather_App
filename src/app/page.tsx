'use client'

import EarthScene from "@/components/earth-scene";
import LocationInput from "@/components/location-search.tsx/location-input";
import { useSearchParams } from "next/navigation";
import React from "react";
import { getWeatherByLocation } from "../utils/api";
import { CurrentWeatherResponse } from "@/types/current-weather";
import WeatherDisplay from "@/components/weather-display.tsx/display";

export default function Home() {
  const searchParams = useSearchParams();

  // derive location directly from search params (default fallback)
  const locationQuery = searchParams.get('location') ?? 'London';

  // data / loading / error state
  const [data, setData] = React.useState<CurrentWeatherResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [coords, setCoords] = React.useState<[string, string]>(['0', '0'])

  // fetch when locationQuery changes; use AbortController to avoid races
  React.useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getWeatherByLocation(locationQuery, { signal });
        if (signal.aborted) return; // ignore if aborted
        setCoords([result.location.lat.toString(), result.location.lon.toString()])
        setData(result);
      } catch (err) {
        if (signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setData(null);
        // optional: console.error(err);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    load();
    return () => {
      controller.abort();
    };
  }, [locationQuery]);

  return (
    <div className="font-sans relative min-h-screen w-full">
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 w-300 flex justify-center p-16">
        <LocationInput />
      </div>

      {/* optional simple UI to show loading / error / data */}
      {loading && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">Loading weather for {locationQuery}…</div>}
      {error && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-red-500">Error: {error}</div>}
      
      {!loading && !error && data && (
        <div className="absolute left-0 top-0 z-1 w-1/3 h-full">
          <WeatherDisplay data={data}/>
        </div>
      )}

      <EarthScene coords={coords}/>
    </div>
  );
}
