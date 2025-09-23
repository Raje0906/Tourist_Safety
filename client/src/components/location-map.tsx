import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png';

// Create custom marker icon
const customIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LocationMapProps {
  lat: number;
  lng: number;
  accuracy?: number; // Location accuracy in meters
  className?: string;
  showAccuracyCircle?: boolean;
}

export default function LocationMap({ 
  lat, 
  lng, 
  accuracy, 
  className = "", 
  showAccuracyCircle = true 
}: LocationMapProps) {
  const mapRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Update map center when coordinates change
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);
      setLastUpdateTime(new Date());
    }
  }, [lat, lng]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Enable map interaction when hovering
    if (mapRef.current) {
      mapRef.current.dragging.enable();
      mapRef.current.touchZoom.enable();
      mapRef.current.doubleClickZoom.enable();
      mapRef.current.scrollWheelZoom.enable();
      mapRef.current.boxZoom.enable();
      mapRef.current.keyboard.enable();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Disable map interaction when not hovering to prevent conflicts
    if (mapRef.current) {
      mapRef.current.dragging.disable();
      mapRef.current.touchZoom.disable();
      mapRef.current.doubleClickZoom.disable();
      mapRef.current.scrollWheelZoom.disable();
      mapRef.current.boxZoom.disable();
      mapRef.current.keyboard.disable();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className} ${isHovered ? 'cursor-grab' : 'cursor-pointer'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered ? 'scale(1.01)' : 'scale(1)',
        transition: 'transform 0.2s ease-out',
      }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        ref={mapRef}
        dragging={false} // Initially disabled, enabled on hover
        touchZoom={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Accuracy circle */}
        {showAccuracyCircle && accuracy && accuracy > 0 && (
          <Circle
            center={[lat, lng]}
            radius={accuracy}
            color="#3b82f6"
            fillColor="#3b82f6"
            fillOpacity={0.1}
            weight={2}
          />
        )}
        
        <Marker position={[lat, lng]} icon={customIcon}>
          <Popup>
            <div className="text-center">
              <strong>Your Current Location</strong>
              <br />
              <span className="text-sm text-green-600">Live Tracking Active</span>
              <br />
              <span className="text-xs text-gray-500">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </span>
              {accuracy && (
                <>
                  <br />
                  <span className="text-xs text-blue-500">
                    Accuracy: ±{Math.round(accuracy)}m
                  </span>
                </>
              )}
              <br />
              <span className="text-xs text-gray-400">
                Updated: {lastUpdateTime.toLocaleTimeString()}
              </span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Hover instruction overlay */}
      {!isHovered && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-white/90 px-3 py-1 rounded-md text-sm text-gray-700 font-medium">
            Hover to explore map
          </div>
        </div>
      )}
    </div>
  );
}