'use client'

import EarthScene from "@/components/earth-scene";
import React from "react";

type CoordType = 'lat' | 'lon'

export default function Home() {

  const [coords, setCoords] = React.useState<[string, string]>(['', ''])

  function setNewCoords(typeOf: CoordType, newCoords: string) {
    setCoords((prevState) => {
      if (typeOf === 'lat') return [newCoords, prevState[1]];
      if (typeOf === 'lon') return [prevState[0], newCoords];
      return prevState;
    })
  }

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <div style={{ display: 'flex', zIndex: 2}}>
        <input
          type="text"
          placeholder="Latitude"
          value={coords[0]}
          onChange={e => setNewCoords('lat', e.target.value)}
        />
        <input
          type="text"
          placeholder="Longitude"
          value={coords[1]}
          onChange={e => setNewCoords('lon', e.target.value)}
        />
      </div>
      <EarthScene coords={coords}/>      
    </div>
  );
}
