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

export async function getForecastByLocation(location: string, days: number = 3, opts?: { signal?: AbortSignal }) {
  const q = encodeURIComponent(location);
  const res = await fetch(`/api/forecast?q=${q}&days=${days}`, { signal: opts?.signal });

  if (!res.ok) {
    // include status/text for easier debugging
    const body = await res.text().catch(() => '');
    throw new Error(`Forecast API error: ${res.status} ${res.statusText} ${body}`);
  }

  const data = await res.json();

  return data; // Return the full forecast response
};

export async function getImageByRegion(place: string) {
  // /api/image?region=City%20of%20London
  const p = encodeURIComponent(place);

  const res = await fetch(`/api/image?place=${p}`);

  if (!res.ok) {
    // include status/text for easier debugging
    const body = await res.text().catch(() => '');
    throw new Error(`Image API error: ${res.status} ${res.statusText} ${body}`);
  };

  const data = await res.json();
  return data;
}

