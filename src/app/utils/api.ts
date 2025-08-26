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
};

export async function getImageByRegion(place: string, limit: number = 1) {
  // /api/image?region=City%20of%20London&limit=3
  const p = encodeURIComponent(place);
  const l = encodeURIComponent(limit);

  const res = await fetch(`/api/image?place=${p}&limit=${l}`);

  if (!res.ok) {
    // include status/text for easier debugging
    const body = await res.text().catch(() => '');
    throw new Error(`Image API error: ${res.status} ${res.statusText} ${body}`);
  };

  const data = await res.json();
  console.log('Image Data Res: ', data);
  return data;
}