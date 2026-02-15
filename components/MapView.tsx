import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSavedLocation } from '../services/locationService';

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

// User location — pulsating blue dot
const userLocationIcon = L.divIcon({
    className: 'user-location-marker',
    html: `<div style="position:relative;width:20px;height:20px;">
        <div style="position:absolute;inset:0;background:#3B82F6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);z-index:2;"></div>
        <div style="position:absolute;inset:-6px;background:rgba(59,130,246,0.2);border-radius:50%;z-index:1;animation:pulse 2s ease-out infinite;"></div>
    </div>
    <style>@keyframes pulse{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.5);opacity:0}}</style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
});

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

// Koordinata yaroqliligini tekshirish (0,0 yaroqsiz)
const isValidCoordinate = (lat: number, lng: number): boolean => {
    return lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Component to fit map to all markers + user location
const MapFitter: React.FC<{ markers: MapMarker[]; userLocation: [number, number] | null }> = ({ markers, userLocation }) => {
    const map = useMap();

    useEffect(() => {
        const points: L.LatLngExpression[] = [];

        if (userLocation) {
            points.push(userLocation);
        }

        markers.forEach(m => {
            if (isValidCoordinate(m.position[0], m.position[1])) {
                points.push(m.position);
            }
        });

        if (points.length === 0) return;

        if (points.length === 1) {
            map.setView(points[0], 14);
        } else {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
    }, [markers.length, userLocation, map]);

    return null;
};

// Map resize handler — leaflet xarita hajmini to'g'ri hisoblashi uchun
const MapResizer: React.FC = () => {
    const map = useMap();

    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);

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
        if (showUserLocation) {
            // Avval saqlangan joylashuvni tekshirish
            const savedLocation = getSavedLocation();
            if (savedLocation && isValidCoordinate(savedLocation.lat, savedLocation.lng)) {
                setUserLocation([savedLocation.lat, savedLocation.lng]);
            } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                    },
                    () => {
                        // GPS ham ishlamasa — default
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            }
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

    // Yaroqli markerlarni filter qilish
    const validMarkers = markers.filter(m => isValidCoordinate(m.position[0], m.position[1]));

    // Map center — user location yoki birinchi marker yoki default
    const mapCenter = userLocation || (validMarkers.length > 0 ? validMarkers[0].position : center);

    return (
        <div style={{ height, width: '100%' }} className="rounded-xl overflow-hidden shadow-lg">
            <MapContainer
                center={mapCenter}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapResizer />
                <MapFitter markers={validMarkers} userLocation={userLocation} />

                {/* Zoom control o'ng pastda */}
                {/* User location marker — pulsating blue dot */}
                {showUserLocation && userLocation && (
                    <Marker position={userLocation} icon={userLocationIcon}>
                        <Popup>
                            <div className="text-center font-medium">
                                Sizning joylashuvingiz
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Job/Worker markers */}
                {validMarkers.map((marker) => (
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
