import { 
  TiWeatherCloudy, 
  TiWeatherDownpour,
  TiWeatherPartlySunny, 
  TiWeatherShower, 
  TiWeatherSnow, 
  TiWeatherStormy, 
  TiWeatherSunny, 
  TiWeatherWindy,
} from 'react-icons/ti';

// Mapping object for weather condition codes to React Icons
const weatherIcons: Record<number, React.ComponentType<object>> = {
  1000: TiWeatherSunny,        // Sunny / Clear
  1003: TiWeatherPartlySunny,  // Partly cloudy
  1006: TiWeatherCloudy,       // Cloudy
  1009: TiWeatherCloudy,       // Overcast
  1030: TiWeatherCloudy,       // Mist
  1063: TiWeatherShower,       // Patchy rain possible
  1066: TiWeatherSnow,         // Patchy snow possible
  1069: TiWeatherSnow,         // Patchy sleet possible
  1072: TiWeatherShower,       // Patchy freezing drizzle possible
  1087: TiWeatherStormy,       // Thundery outbreaks possible
  1114: TiWeatherWindy,        // Blowing snow
  1117: TiWeatherSnow,         // Blizzard
  1135: TiWeatherCloudy,       // Fog
  1147: TiWeatherCloudy,       // Freezing fog
  1150: TiWeatherShower,       // Patchy light drizzle
  1153: TiWeatherShower,       // Light drizzle
  1168: TiWeatherShower,       // Freezing drizzle
  1171: TiWeatherDownpour,     // Heavy freezing drizzle
  1180: TiWeatherShower,       // Patchy light rain
  1183: TiWeatherShower,       // Light rain
  1186: TiWeatherShower,       // Moderate rain at times
  1189: TiWeatherShower,       // Moderate rain
  1192: TiWeatherDownpour,     // Heavy rain at times
  1195: TiWeatherDownpour,     // Heavy rain
  1198: TiWeatherShower,       // Light freezing rain
  1201: TiWeatherDownpour,     // Moderate or heavy freezing rain
  1204: TiWeatherSnow,         // Light sleet
  1207: TiWeatherSnow,         // Moderate or heavy sleet
  1210: TiWeatherSnow,         // Patchy light snow
  1213: TiWeatherSnow,         // Light snow
  1216: TiWeatherSnow,         // Patchy moderate snow
  1219: TiWeatherSnow,         // Moderate snow
  1222: TiWeatherSnow,         // Patchy heavy snow
  1225: TiWeatherSnow,         // Heavy snow
  1237: TiWeatherSnow,         // Ice pellets
  1240: TiWeatherShower,       // Light rain shower
  1243: TiWeatherDownpour,     // Moderate or heavy rain shower
  1246: TiWeatherDownpour,     // Torrential rain shower
  1249: TiWeatherSnow,         // Light sleet showers
  1252: TiWeatherSnow,         // Moderate or heavy sleet showers
  1255: TiWeatherSnow,         // Light snow showers
  1258: TiWeatherSnow,         // Moderate or heavy snow showers
  1261: TiWeatherSnow,         // Light showers of ice pellets
  1264: TiWeatherSnow,         // Moderate or heavy showers of ice pellets
  1273: TiWeatherStormy,       // Patchy light rain with thunder
  1276: TiWeatherStormy,       // Moderate or heavy rain with thunder
  1279: TiWeatherStormy,       // Patchy light snow with thunder
  1282: TiWeatherStormy,       // Moderate or heavy snow with thunder
};

export default weatherIcons