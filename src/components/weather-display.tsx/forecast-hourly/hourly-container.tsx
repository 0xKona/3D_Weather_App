import { ForecastDay, HourForecast } from "@/types/forecast-weather";
import HourlyCard from "./hour-card";

interface Props {
    selectedDay: ForecastDay;
}

export default function HourlyContainer({ selectedDay }: Props) {

    const currentTime = Math.floor(Date.now() / 1000); // Current time in epoch

    return (
        <div className="card w-full bg-black/20 backdrop-blur-sm rounded-lg p-4 text-white shadow-xl">
            <h4 className="text-md font-semibold mb-4">
                Hourly Forecast for {new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h4>
            <div className="flex space-x-4 overflow-x-auto pb-2">
                {selectedDay.hour
                    .filter((hour: HourForecast) => hour.time_epoch > currentTime)
                    .map((hour: HourForecast, index: number) => (
                        <div key={index} className="flex-shrink-0">
                            <HourlyCard hour={hour} />
                        </div>
                    ))}
            </div>
        </div>
    )
}