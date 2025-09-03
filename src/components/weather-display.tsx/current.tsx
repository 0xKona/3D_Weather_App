import { CurrentWeatherResponse } from "@/types/current-weather"
import Image from "next/image";

interface Props {
    data: CurrentWeatherResponse;
}

export default function CurrentWeatherCard({ data }: Props) {

    const { current } = data;
    
    // Convert protocol-relative URL to absolute URL
    const iconUrl = current.condition.icon.startsWith('//') 
        ? `https:${current.condition.icon}` 
        : current.condition.icon;

    return (
        <div className="flex flex-col items-center mr-5">
              <Image 
                src={iconUrl} 
                alt={current.condition.text}
                height={70}
                width={70}
              />
              <div className="text-xs text-center opacity-70">
                {current.is_day ? 'Day' : 'Night'}
              </div>
            </div>
    )
}