import { CurrentWeatherResponse } from "@/types/current-weather";
import CoverImage from "./cover";
import CurrentWeatherCard from "./current";
import ForecastWeekDisplay from "./forecast-week";

interface Props {
    data: CurrentWeatherResponse;
}

export default function WeatherDisplay({ data }: Props) {
  if (!data) return null;
  const { location, current } = data;
  return (
    <div className="flex flex-col w-full h-screen p-16 bg-transparent">
      <CoverImage data={data} />
      <CurrentWeatherCard data={data} />
      <ForecastWeekDisplay />
      
      {/* Detailed Weather Data Card */}
      <div className="card flex-1 shadow-xl overflow-y-auto  bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
        <div className="card-body">
          <h3 className="text-lg font-semibold mb-3">Detailed Weather</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div><span className="font-semibold">Temperature:</span> {current.temp_c}°C / {current.temp_f}°F</div>
            <div><span className="font-semibold">Feels Like:</span> {current.feelslike_c}°C / {current.feelslike_f}°F</div>
            <div><span className="font-semibold">Humidity:</span> {current.humidity}%</div>
            <div><span className="font-semibold">Wind:</span> {current.wind_kph} kph / {current.wind_mph} mph</div>
            <div><span className="font-semibold">Pressure:</span> {current.pressure_mb} mb</div>
            <div><span className="font-semibold">Precipitation:</span> {current.precip_mm} mm</div>
            <div><span className="font-semibold">Cloud:</span> {current.cloud}%</div>
            <div><span className="font-semibold">UV Index:</span> {current.uv}</div>
            <div><span className="font-semibold">Wind Chill:</span> {current.windchill_c}°C / {current.windchill_f}°F</div>
            <div><span className="font-semibold">Heat Index:</span> {current.heatindex_c}°C / {current.heatindex_f}°F</div>
            <div><span className="font-semibold">Dew Point:</span> {current.dewpoint_c}°C / {current.dewpoint_f}°F</div>
            <div><span className="font-semibold">Visibility:</span> {current.vis_km} km / {current.vis_miles} mi</div>
            <div><span className="font-semibold">Gust:</span> {current.gust_kph} kph / {current.gust_mph} mph</div>
            <div><span className="font-semibold">Wind Direction:</span> {current.wind_dir} ({current.wind_degree}°)</div>
            <div><span className="font-semibold">Local Time:</span> {location.localtime}</div>
          </div>
          <div className="card-actions justify-end mt-4">
            <span className="badge badge-info text-xs">Last Updated: {current.last_updated}</span>
          </div>
        </div>
      </div>
    </div>
  );
}