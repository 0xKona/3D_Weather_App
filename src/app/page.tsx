'use client'

import EarthScene from "@/components/earth-scene";
import LocationInput from "@/components/location-search.tsx/location-input";
import { useSearchParams } from "next/navigation";
import React from "react";
import { getWeatherByLocation } from "./utils/api";

export default function Home() {
  const searchParams = useSearchParams();

  // derive location directly from search params (default fallback)
  const locationQuery = searchParams.get('location') ?? 'London';

  // data / loading / error state
  const [data, setData] = React.useState<any | null>(null);
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

  function setNewCoords(typeOf: 'lat' | 'lon', newCoords: string) {
    setCoords((prevState) => {
      if (typeOf === 'lat') return [newCoords, prevState[1]];
      if (typeOf === 'lon') return [prevState[0], newCoords];
      return prevState;
    })
  }

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20" style={{maxWidth: '100vw'}}>
      <div style={{ display: 'flex', zIndex: 2, width: '100%'}}>
        <LocationInput />
      </div>

      {/* optional simple UI to show loading / error / data */}
      <div style={{ zIndex: 2, width: '100vw' }}>
        {loading && <div>Loading weather for {locationQuery}…</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {!loading && !error && data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      </div>

      <EarthScene coords={coords}/>
    </div>
  );
}
