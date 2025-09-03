export default function Footer() {
    return (
        <footer className="w-full bg-black/20 backdrop-blur-sm text-white py-4 px-6 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center text-sm">
                <div className="mb-2 md:mb-0">
                    <p>&copy; Created by Connor Robinson (2025).</p>
                </div>
                <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-4">
                    <p>Weather data from: <a href="https://www.weatherapi.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">WeatherAPI</a></p>
                    <p>Images from: <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">Pixabay</a></p>
                </div>
            </div>
        </footer>
    );
}