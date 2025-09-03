import { CurrentWeatherResponse } from "@/types/current-weather";
import weatherIcons from "@/utils/get-weather-icon";
import React from "react";
import { TiWeatherSunny } from "react-icons/ti";

interface Props {
  data: CurrentWeatherResponse;
}

export default function CurrentWeatherCard({ data }: Props) {
  const { current, location } = data;
  const [isCelsius, setIsCelsius] = React.useState(true);

  // Get the appropriate icon based on condition code
  const WeatherIcon = (weatherIcons[current.condition.code] || TiWeatherSunny) as React.ComponentType<{ size?: number }>;

  // Format local time
  const localTime = new Date(location.localtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className="card w-full bg-black/20 backdrop-blur-sm rounded-lg p-4 text-white shadow-xl"
    >
      <div className="flex justify-between items-center space-x-4">
        <div className="text-left flex-1">
          <h3 className="text-lg font-semibold mb-1">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2 mb-1"></span>
            Live Weather 
            <span className="ml-2 text-xs opacity-50 mt-1">{`(Updated: ${localTime})`}</span>
          </h3>
          <h4 className="text-md font-medium">{current.condition.text}</h4>
          <p className="text-sm opacity-70">{current.is_day ? 'Day' : 'Night'}</p>
        </div>
        <div className="flex flex-col items-center cursor-pointer" onClick={() => setIsCelsius(!isCelsius)}>
          <WeatherIcon size={50} />
          <p className="text-xl font-bold mt-2">
            {isCelsius ? current.temp_c : current.temp_f}°{isCelsius ? 'C' : 'F'}
          </p>
        </div>
      </div>
    </div>
  );
}