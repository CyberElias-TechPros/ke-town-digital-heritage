import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, ZoomIn, ZoomOut } from "lucide-react";

interface MapLocation {
  name: string;
  lat: number;
  lng: number;
  description?: string;
  type?: "Kingdom" | "landmark" | "waterway" | "festival";
}

interface InteractiveMapProps {
  locations?: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
}

const defaultLocations: MapLocation[] = [
  {
    name: "Ke Kingdom",
    lat: 4.7833,
    lng: 6.8167,
    description: "Main settlement in Degema LGA",
    type: "Kingdom",
  },
  {
    name: "Degema",
    lat: 4.75,
    lng: 6.85,
    description: "Local Government Area headquarters",
    type: "landmark",
  },
  {
    name: "New Calabar River",
    lat: 4.8,
    lng: 6.8,
    description: "Major waterway system",
    type: "waterway",
  },
  {
    name: "Bille Creek",
    lat: 4.7667,
    lng: 6.8333,
    description: "Traditional fishing area",
    type: "waterway",
  },
  {
    name: "Kra-kra Creek",
    lat: 4.8167,
    lng: 6.7833,
    description: "Mangrove waterway",
    type: "waterway",
  },
];

const InteractiveMap = ({
  locations = defaultLocations,
  center = { lat: 4.7833, lng: 6.8167 },
  zoom = 12,
  height = "400px",
}: InteractiveMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  // Simulated map using OpenStreetMap tiles (no API key required)
  const tileUrl = `https://tile.openstreetmap.org/${currentZoom}/${Math.floor(((center.lng + 180) / 360) * Math.pow(2, currentZoom))}/${Math.floor(((1 - Math.log(Math.tan((center.lat * Math.PI) / 180) + 1 / Math.cos((center.lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, currentZoom))}.png`;

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => setMapLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleZoomIn = () => {
    setCurrentZoom((prev) => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setCurrentZoom((prev) => Math.max(prev - 1, 8));
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "Kingdom":
        return "bg-secondary text-secondary-foreground";
      case "landmark":
        return "bg-accent text-accent-foreground";
      case "waterway":
        return "bg-ke-water text-white";
      case "festival":
        return "bg-ke-gold text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border shadow-[var(--shadow-card)]">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="relative w-full bg-ke-water/10"
        style={{ height }}
      >
        {/* OpenStreetMap Tile Layer */}
        <div className="absolute inset-0">
          <img
            src={tileUrl}
            alt="Map of Ke Kingdom area"
            className="w-full h-full object-cover"
            onLoad={() => setMapLoaded(true)}
            onError={() => setMapLoaded(false)}
          />
        </div>

        {/* Loading State */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-ke-water/20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-ui">Loading map...</p>
            </div>
          </div>
        )}

        {/* Location Markers */}
        {mapLoaded &&
          locations.map((location, index) => (
            <motion.div
              key={location.name}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
              className="absolute cursor-pointer group"
              style={{
                left: `${((location.lng - (center.lng - 0.1)) / 0.2) * 100}%`,
                top: `${((center.lat + 0.1 - location.lat) / 0.2) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              onClick={() => setSelectedLocation(location)}
            >
              <div
                className={`w-8 h-8 rounded-full ${getTypeColor(
                  location.type
                )} flex items-center justify-center shadow-lg group-hover:scale-125 transition-transform`}
              >
                <MapPin size={16} />
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                  <p className="font-display text-sm font-semibold text-foreground">
                    {location.name}
                  </p>
                  {location.description && (
                    <p className="text-xs text-muted-foreground font-ui mt-0.5">
                      {location.description}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 bg-card border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors shadow-lg"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 bg-card border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors shadow-lg"
          >
            <ZoomOut size={16} />
          </button>
        </div>

        {/* Compass */}
        <div className="absolute bottom-4 right-4 w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-lg">
          <Navigation size={20} className="text-secondary" />
        </div>
      </div>

      {/* Location Legend */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex flex-wrap gap-3">
          {[
            { type: "Kingdom", label: "Kingdoms" },
            { type: "landmark", label: "Landmarks" },
            { type: "waterway", label: "Waterways" },
            { type: "festival", label: "Festival Sites" },
          ].map((item) => (
            <div key={item.type} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${getTypeColor(item.type)}`}
              />
              <span className="text-xs font-ui text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Location Info */}
      {selectedLocation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-20 left-4 right-4 bg-card border border-border rounded-xl p-4 shadow-xl"
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-display text-lg font-semibold text-foreground">
                {selectedLocation.name}
              </h4>
              {selectedLocation.description && (
                <p className="text-sm text-muted-foreground font-body mt-1">
                  {selectedLocation.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground font-ui mt-2">
                Coordinates: {selectedLocation.lat.toFixed(4)}°N,{" "}
                {selectedLocation.lng.toFixed(4)}°E
              </p>
            </div>
            <button
              onClick={() => setSelectedLocation(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default InteractiveMap;