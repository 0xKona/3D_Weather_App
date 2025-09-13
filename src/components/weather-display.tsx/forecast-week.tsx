import { useSearchParams } from "next/navigation";
import React from "react";
import { getForecastByLocation } from "@/utils/api";
import { ForecastDay, ForecastResponse } from "@/types/forecast-weather";
import ForecastDayCard from "./forecast-day-card/forecast-day-card";

interface Props {
    setSelectedDay: React.Dispatch<React.SetStateAction<ForecastDay | null>>
}

export default function ForecastWeekDisplay({ setSelectedDay}: Props) {
    const searchParams = useSearchParams();
    const locationQuery = searchParams.get('location') ?? 'London';

    // State with proper typing
    const [data, setData] = React.useState<ForecastResponse | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const daysToRequest = 3;

    React.useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();


        const fetchForecast = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await getForecastByLocation(locationQuery, daysToRequest, { signal: controller.signal });
                if (isMounted) {
                    setData(result as ForecastResponse); // Type assertion for the API response
                    // By default, select the first forecast day
                    if (result.forecast && result.forecast.forecastday.length > 0) {
                        setSelectedDay(result.forecast.forecastday[0]);
                    } else {
                        setSelectedDay(null);
                    }
                }
            } catch (err) {
                if (isMounted && err instanceof Error && err.name !== 'AbortError') {
                    setError(err.message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchForecast();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [locationQuery, setSelectedDay]);

    const handleDayClick = (day: ForecastDay) => {
        setSelectedDay(day);
    };

    if (loading) {
        return (
            <div className="card w-full bg-black/20 backdrop-blur-sm rounded-lg p-4 text-white shadow-xl">
                <div className="flex items-center justify-center">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <span className="ml-2">Loading forecast...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card w-full bg-black/20 backdrop-blur-sm rounded-lg p-4 text-white shadow-xl">
                <p className="text-red-500">Error: {error}</p>
            </div>
        );
    }

    if (!data || !data.forecast || !data.forecast.forecastday) {
        return (
            <div className="card w-full bg-black/20 backdrop-blur-sm rounded-lg p-4 text-white shadow-xl">
                <p>No forecast data available.</p>
            </div>
        );
    }

    const forecastDays = data.forecast.forecastday;

    return (
        <div className="card w-full bg-black/20 backdrop-blur-sm rounded-lg p-4 text-white shadow-xl">
            <div className="grid grid-cols-3 gap-4 mb-6 auto-rows-fr">
                {forecastDays.map((day: ForecastDay, index: number) => (
                    <div onClick={() => handleDayClick(day)} key={index}>
                        <ForecastDayCard day={day} />
                    </div>
                ))}
            </div>
        </div>
    );
}