import { ForecastDay, HourForecast } from "@/types/forecast-weather";
import HourlyCard from "./hour-card";

interface Props {
    selectedDay: ForecastDay;
}

export default function HourlyContainer({ selectedDay }: Props) {

    const currentTime = Math.floor(Date.now() / 1000); // Current time in epoch

    return (
        <div className="card w-full bg-black/20 backdrop-blur-sm rounded-lg p-4 text-white shadow-xl flex flex-col h-full min-h-0">
            {/* True flex scroll area: allow it to shrink and overflow-y only */}
            <div className="flex flex-col gap-2 pb-2 overflow-y-auto flex-1 min-h-0">
                {selectedDay.hour
                    .filter((hour: HourForecast) => hour.time_epoch > currentTime)
                    .map((hour: HourForecast, index: number) => (
                        <div key={index} className="flex-shrink-0 w-full">
                            <HourlyCard hour={hour} />
                        </div>
                    ))}
            </div>
        </div>
    )
}