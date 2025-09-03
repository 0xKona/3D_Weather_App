import { EarthView } from "@/types/manual-rotation";

interface Props {
  manualRotation: EarthView;
  setManualRotation: React.Dispatch<React.SetStateAction<EarthView>>;
}

export default function EarthControls({manualRotation, setManualRotation}: Props) {

    return (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
        <h3 className="text-sm font-semibold mb-3">Manual Rotation</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1">Latitude: {manualRotation.lat.toFixed(1)}°</label>
            <input
              type="range"
              min="-45"
              max="45"
              step="0.5"
              value={manualRotation.lat}
              onChange={(e) => setManualRotation(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          <div>
            <label className="block text-xs mb-1">Longitude: {manualRotation.lng.toFixed(1)}°</label>
            <input
              type="range"
              min="-180"
              max="180"
              step="0.5"
              value={manualRotation.lng}
              onChange={(e) => setManualRotation(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          <button
            onClick={() => setManualRotation({ lat: 0, lng: 0 })}
            className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
          >
            Reset to Center
          </button>
        </div>
      </div>
    )
}