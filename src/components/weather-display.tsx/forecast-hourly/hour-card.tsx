import { HourForecast } from "@/types/forecast-weather";
import weatherIcons from "@/utils/get-weather-icon";
import { TiWeatherSunny } from "react-icons/ti";

interface Props {
    hour: HourForecast;
}

export default function HourlyCard({ hour }: Props) {

    const hourTime = new Date(hour.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const WeatherIcon = (weatherIcons[hour.condition.code] || TiWeatherSunny) as React.ComponentType<{ size?: number, className?: string }>;
    return (
        <div className="flex items-center gap-3 p-2 m-1 bg-black/10 rounded-lg border border-white w-[98%]">
            <p className="text-xs font-medium">{hourTime}</p>
            <p className="text-xs opacity-70">{hour.condition.text}</p>
            <p className="ml-auto text-sm font-semibold">{hour.temp_c}°C</p>
            <WeatherIcon size={30} />
        </div>
    );
}