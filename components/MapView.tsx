import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
    });
};

export const jobIcon = createCustomIcon('#3B82F6'); // Blue
export const userIcon = createCustomIcon('#10B981'); // Green
export const workerIcon = createCustomIcon('#8B5CF6'); // Purple

export interface MapMarker {
    id: string;
    position: [number, number]; // [lat, lng]
    title: string;
    description?: string;
    price?: number;
    category?: string;
    type: 'job' | 'user' | 'worker';
    onClick?: () => void;
}

interface MapViewProps {
    markers: MapMarker[];
    center?: [number, number];
    zoom?: number;
    height?: string;
    onMarkerClick?: (marker: MapMarker) => void;
    showUserLocation?: boolean;
}

// Component to update map center
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

export const MapView: React.FC<MapViewProps> = ({
    markers,
    center = [41.311081, 69.240562], // Tashkent default
    zoom = 12,
    height = '400px',
    onMarkerClick,
    showUserLocation = true,
}) => {
    const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);

    useEffect(() => {
        if (showUserLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                },
                (err) => {
                    console.log('Could not get user location:', err);
                }
            );
        }
    }, [showUserLocation]);

    const getIcon = (type: MapMarker['type']) => {
        switch (type) {
            case 'job':
                return jobIcon;
            case 'worker':
                return workerIcon;
            case 'user':
            default:
                return userIcon;
        }
    };

    return (
        <div style={{ height, width: '100%' }} className="rounded-xl overflow-hidden shadow-lg">
            <MapContainer
                center={userLocation || center}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userLocation && <MapUpdater center={userLocation} />}

                {/* User location marker */}
                {showUserLocation && userLocation && (
                    <Marker position={userLocation} icon={userIcon}>
                        <Popup>
                            <div className="text-center">
                                <strong>📍 Sizning joylashuvingiz</strong>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Job/Worker markers */}
                {markers.map((marker) => (
                    <Marker
                        key={marker.id}
                        position={marker.position}
                        icon={getIcon(marker.type)}
                        eventHandlers={{
                            click: () => {
                                if (onMarkerClick) onMarkerClick(marker);
                                if (marker.onClick) marker.onClick();
                            },
                        }}
                    >
                        <Popup>
                            <div className="min-w-[200px]">
                                {marker.category && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                        {marker.category}
                                    </span>
                                )}
                                <h3 className="font-bold text-gray-900 mt-1">{marker.title}</h3>
                                {marker.description && (
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{marker.description}</p>
                                )}
                                {marker.price && (
                                    <p className="text-green-600 font-bold mt-2">
                                        {marker.price.toLocaleString()} so'm
                                    </p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapView;
