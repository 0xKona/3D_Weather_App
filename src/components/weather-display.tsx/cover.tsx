/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { getImageByRegion } from '@/utils/api';
import { CurrentWeatherResponse } from '@/types/current-weather';

interface Props {
  data: CurrentWeatherResponse;
}

export default function CoverImage({ data }: Props) {
  const [src, setSrc] = React.useState<string>('/textures/clouds_map.jpg');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);

    const { location } = data;
    const { name, region } = location;
    const place = `${name}, ${region}`;

    getImageByRegion(place)
      .then((images: string[]) => {
        if (!mounted) return;
        const first = Array.isArray(images) && images.length > 0 ? images[0] : null;
        if (first) setSrc(first);
      })
      .catch(() => {
        /* ignore and keep fallback */
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [data]);

  const { location } = data;

  if (loading) {
    return (
      <div className="card bg-base-100 w-full aspect-[16/7] relative overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 w-full aspect-[16/7] relative overflow-hidden">
      <figure className="w-full h-full absolute inset-0">
        <img
          src={src}
          alt="Location Image"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </figure>
      <div className="card-body absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4">
        <div className="text-white">
          <h2 className="card-title text-xl font-bold">{location.name}, {location.region}</h2>
          <p>{location.country}</p>
        </div>
      </div>
    </div>
  );
}