import { NextResponse } from 'next/server';

/**
 * GET /api/image?place=City%20of%20London&limit=3
 *
 * Returns high-resolution Wikimedia Commons images for a given place.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const place = url.searchParams.get('place');
    const rawLimit = url.searchParams.get('limit');

    if (!place) {
      return NextResponse.json({ error: 'missing "place" query param' }, { status: 400 });
    }

    const limit = Math.min(Math.max(Number(rawLimit) || 3, 1), 20);
    const TARGET_WIDTH = 1920;
    const TARGET_ASPECT = 16 / 9;
    const TOLERANCE = 0.03;

    const searchTerm = encodeURIComponent(`${place} skyline`);
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${searchTerm}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url|size&format=json&origin=*`;

    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Wikimedia API ${res.status}`);

    const data = await res.json();
    if (!data.query?.pages) return NextResponse.json([], { status: 200 });

    interface ImageInfo {
      url: string;
      width: number;
      height: number;
    }

    type WikimediaPage = {
      imageinfo?: ImageInfo[];
      [key: string]: unknown;
    };

    const images = Object.values(data.query.pages as Record<string, WikimediaPage>)
      .map((p) => p.imageinfo?.[0] as ImageInfo | undefined)
      .filter((i): i is ImageInfo => !!i)
      .map((i) => ({
        url: i.url,
        width: i.width,
        height: i.height,
      }));

    // Prefer 1920x1080 -> close 16:9 -> any
    const exact = images.filter(i => i.width === TARGET_WIDTH && Math.abs((i.width/i.height)-TARGET_ASPECT) < TOLERANCE);
    const close = exact.length ? exact : images.filter(i => Math.abs((i.width/i.height)-TARGET_ASPECT) < TOLERANCE);
    const chosen = (close.length ? close : images).slice(0, limit).map(i => i.url);

    return NextResponse.json(chosen, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
