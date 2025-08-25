import { CurrentWeatherResponse } from "@/types/current-weather";

export async function getWeatherByLocation(location: string, opts?: { signal?: AbortSignal }) {
  const q = encodeURIComponent(location);
  const res = await fetch(`/api/weather?q=${q}`, { signal: opts?.signal });

  if (!res.ok) {
    // include status/text for easier debugging
    const body = await res.text().catch(() => '');
    throw new Error(`Weather API error: ${res.status} ${res.statusText} ${body}`);
  }

  const data = await res.json();

  return data as CurrentWeatherResponse;
}