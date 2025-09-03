import { NextResponse } from 'next/server';

/**
 * GET /api/forecast?q=London&days=7
 *
 * Returns weather forecast data for a given location.
 * Uses the same WeatherAPI as the /api/weather route.
 * Requires WEATHER_API_KEY environment variable.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    const days = url.searchParams.get('days') || '7'; // Default to 7 days

    if (!q) {
      return NextResponse.json({ error: 'missing "q" query param' }, { status: 400 });
    }

    const apiKey = process.env.WEATHER_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'WEATHER_KEY not configured' }, { status: 500 });
    }

    const apiUrl = `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(q)}&days=${days}&aqi=no&alerts=no`;

    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error(`WeatherAPI error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}