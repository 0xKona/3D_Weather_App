import { ForecastDay } from "@/types/forecast-weather";
import weatherIcons from "@/utils/get-weather-icon";
import { TiWeatherSunny } from "react-icons/ti";

interface Props {
    day: ForecastDay;
}

export default function ForecastDayCard({ day }: Props) {

    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const WeatherIcon = (weatherIcons[day.day.condition.code] || TiWeatherSunny) as React.ComponentType<{ size?: number, className: string }>;

    return (
        <div className="h-full flex flex-col p-2 bg-black/10 rounded-lg border border-white cursor-pointer">
            <div className="flex flex-col items-center">
                <p className="text-sm font-medium">{dayName}</p>
                <WeatherIcon size={40} className="my-2" />
            </div>

            <div className="flex-1 flex items-center w-full">
                <p className="text-xs text-center whitespace-normal break-words w-full">{day.day.condition.text}</p>
            </div>

            <div className="flex flex-col items-center">
                <p className="text-lg font-bold">{day.day.maxtemp_c}°C</p>
                <p className="text-sm opacity-70">{day.day.mintemp_c}°C</p>
            </div>
        </div>
    );
}