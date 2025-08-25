import { NextResponse } from 'next/server';

/**
 * GET /api/weather?q=LOCATION
 *
 * - Reads server-only WEATHER_KEY from process.env
 * - Reads `q` or `location` query param from the incoming request URL
 * - Calls WeatherAPI's current.json endpoint and proxies the JSON back to the client
 * - Forwards the request abort signal to the outbound fetch so it can be cancelled
 * - Returns helpful error information on bad config / missing params / upstream errors
 */
export async function GET(req: Request) {
  // get API key from server env - keep this out of client builds
  const key = process.env.WEATHER_KEY;
  if (!key) {
    // 500 if the key isn't set
    return NextResponse.json({ error: 'WEATHER_KEY not configured' }, { status: 500 });
  }

  // parse incoming request URL to read query params
  const url = new URL(req.url);
  // accept either `q` or `location` for flexibility
  const location = url.searchParams.get('q') ?? url.searchParams.get('location');
  if (!location) {
    // 400 when required query param is missing
    return NextResponse.json({ error: 'missing q or location query param' }, { status: 400 });
  }

  // build WeatherAPI URL (current weather endpoint). `aqi=no` disables air quality to keep it simple.
  const apiUrl = `https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(
    key
  )}&q=${encodeURIComponent(location)}&aqi=no`;

  try {
    // forward the incoming request's abort signal so callers can cancel the outbound fetch
    const signal = (req as any).signal;
    const res = await fetch(apiUrl, { signal });

    // if the upstream service returned an error, capture details and forward status
    if (!res.ok) {
      const details = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'Weather API error', status: res.status, details },
        { status: res.status }
      );
    }

    // successful response: parse JSON and return to client
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    // handle client aborts separately (optional - 499 is convention for client closed request)
    if ((err as any)?.name === 'AbortError') {
      return new NextResponse(null, { status: 499 });
    }
    // generic server error
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}