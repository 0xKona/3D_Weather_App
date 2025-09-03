import { NextResponse } from 'next/server';

/**
 * GET /api/image?place=City%20of%20London
 *
 * Returns high-resolution Pixabay images for a given place.
 * Requires PIXABAY_API_KEY environment variable.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const place = url.searchParams.get('place');

    if (!place) {
      return NextResponse.json({ error: 'missing "place" query param' }, { status: 400 });
    }

    const limit = 5;
    const TARGET_WIDTH = 1920;
    const TARGET_ASPECT = 16 / 9;
    const TOLERANCE = 0.03;

    const searchTerm = encodeURIComponent(`${place} skyline`);
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'PIXABAY_API_KEY not configured' }, { status: 500 });
    }

    const apiUrl = `https://pixabay.com/api/?key=${apiKey}&q=${searchTerm}&image_type=photo&per_page=${limit}&safesearch=true`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Pixabay API ${res.status}`);

    const data = await res.json();
    if (!data.hits || data.hits.length === 0) return NextResponse.json([], { status: 200 });

    interface PixabayImage {
      largeImageURL: string;
      webformatWidth: number;
      webformatHeight: number;
    }

    const images = data.hits.map((hit: PixabayImage) => ({
      url: hit.largeImageURL,
      width: hit.webformatWidth,
      height: hit.webformatHeight,
    }));

    // Prefer close to 1920x1080 -> close 16:9 -> any
    interface ImageInfo {
      url: string;
      width: number;
      height: number;
    }

    const exact: ImageInfo[] = images.filter((i: ImageInfo) => i.width >= TARGET_WIDTH && Math.abs((i.width / i.height) - TARGET_ASPECT) < TOLERANCE);
    const close = exact.length ? exact : images.filter((i: ImageInfo) => Math.abs((i.width / i.height) - TARGET_ASPECT) < TOLERANCE);

    const chosen: string[] = (close.length ? close : images).slice(0, limit).map((i: ImageInfo) => i.url);

    return NextResponse.json(chosen, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
