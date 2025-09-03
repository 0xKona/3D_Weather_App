import { HourForecast } from "@/types/forecast-weather";
import weatherIcons from "@/utils/get-weather-icon";
import { TiWeatherSunny } from "react-icons/ti";

interface Props {
    hour: HourForecast;
}

export default function HourlyCard({ hour }: Props) {

    const hourTime = new Date(hour.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const WeatherIcon = (weatherIcons[hour.condition.code] || TiWeatherSunny) as React.ComponentType<{ size?: number, className: string }>;;
    return (
        <div className="flex flex-col items-center p-2 bg-black/10 rounded-lg">
            <p className="text-xs font-medium">{hourTime}</p>
            <WeatherIcon size={30} className="my-1" />
            <p className="text-sm">{hour.temp_c}°C</p>
            <p className="text-xs opacity-70">{hour.condition.text}</p>
        </div>
    );
}