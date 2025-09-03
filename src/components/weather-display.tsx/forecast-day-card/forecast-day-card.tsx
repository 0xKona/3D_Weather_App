import { ForecastDay } from "@/types/forecast-weather";
import weatherIcons from "@/utils/get-weather-icon";
import { TiWeatherSunny } from "react-icons/ti";

interface Props {
    day: ForecastDay;
}

export default function ForecastDayCard({ day }: Props) {

    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const WeatherIcon = (weatherIcons[day.day.condition.code] || TiWeatherSunny) as React.ComponentType<{ size?: number, className: string }>;;

    return (
        <div className="flex flex-col items-center p-2 bg-black/10 rounded-lg">
            <p className="text-sm font-medium">{dayName}</p>
            <WeatherIcon size={40} className="my-2" />
            <p className="text-xs">{day.day.condition.text}</p>
            <p className="text-lg font-bold">{day.day.maxtemp_c}°C</p>
            <p className="text-sm opacity-70">{day.day.mintemp_c}°C</p>
        </div>
    );
}