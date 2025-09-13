import { CurrentWeatherResponse } from "@/types/current-weather";
import CoverImage from "./cover";
import CurrentWeatherCard from "./current";
import ForecastWeekDisplay from "./forecast-week";
import HourlyContainer from "./forecast-hourly/hourly-container";
import { ForecastDay } from "@/types/forecast-weather";
import React from "react";

interface Props {
    data: CurrentWeatherResponse | null;
    loading: boolean;
    error: string | null;
}

export default function WeatherDisplay({ data, loading, error }: Props) {

  const [selectedDay, setSelectedDay] = React.useState<ForecastDay | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col w-full md:h-screen md:p-16 justify-center items-center bg-transparent">
        <div className="card w-full max-w-md bg-black/20 backdrop-blur-sm rounded-lg p-4 text-white shadow-xl">
          <div className="flex items-center justify-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <span className="ml-2">Loading weather data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col w-full md:h-screen md:p-16 justify-center items-center bg-transparent">
        <div className="card w-full max-w-md bg-black/20 backdrop-blur-sm rounded-lg p-4 text-white shadow-xl">
          <p className="text-red-500 text-center">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    // Mobile: natural page flow and scrolling (overflow-auto).
    // Desktop (md+): fixed to viewport height and internal scrolling for the hourly list.
    <div className="flex flex-col w-full h-auto md:h-screen md:p-16 justify-start md:justify-between bg-transparent overflow-auto md:overflow-hidden">
      <CoverImage data={data} />
      <CurrentWeatherCard data={data} />
      <ForecastWeekDisplay setSelectedDay={setSelectedDay} />

      {/* Hourly panel should take remaining space on desktop and be scrollable internally.
          md:flex-1 + md:min-h-0 ensures the child can shrink and its inner overflow works. */}
      {selectedDay && (
        <div className="mt-4 w-full md:flex-1 md:min-h-0">
          <HourlyContainer selectedDay={selectedDay} />
        </div>
      )}
    </div>
  );
}