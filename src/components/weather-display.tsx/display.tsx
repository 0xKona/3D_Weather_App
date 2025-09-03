import { CurrentWeatherResponse } from "@/types/current-weather";
import CoverImage from "./cover";
import CurrentWeatherCard from "./current";
import ForecastWeekDisplay from "./forecast-week";
import HourlyContainer from "./forecast-hourly/hourly-container";
import { ForecastDay } from "@/types/forecast-weather";
import React from "react";

interface Props {
    data: CurrentWeatherResponse;
}

export default function WeatherDisplay({ data }: Props) {

  const [selectedDay, setSelectedDay] = React.useState<ForecastDay | null>(null);

  if (!data) return null;
  return (
    <div className="flex flex-col w-full h-screen p-16 justify-between bg-transparent">
      <CoverImage data={data} />
      <CurrentWeatherCard data={data} />
      <ForecastWeekDisplay setSelectedDay={setSelectedDay} />
      {selectedDay && (
          <HourlyContainer selectedDay={selectedDay} />
      )}
    </div>
  );
}