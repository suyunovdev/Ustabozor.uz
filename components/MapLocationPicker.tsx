import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, X, Check, Search } from 'lucide-react';
import { getAddressFromCoordinates, getSavedLocation, saveLocation, LocationData } from '../services/locationService';

// Custom marker icon for selected location
const selectedLocationIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="
        background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 4px solid white;
        box-shadow: 0 4px 15px rgba(59,130,246,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
    ">
        <div style="
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
            transform: rotate(45deg);
        "></div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
});

interface MapLocationPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationSelect: (location: LocationData) => void;
    initialLocation?: { lat: number; lng: number };
}

// Component to handle map clicks
const LocationSelector: React.FC<{
    onLocationSelect: (lat: number, lng: number) => void;
    selectedPosition: [number, number] | null;
}> = ({ onLocationSelect, selectedPosition }) => {
    useMapEvents({
        click: (e) => {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    return selectedPosition ? (
        <Marker position={selectedPosition} icon={selectedLocationIcon} />
    ) : null;
};

// Component to fly to location
const FlyToLocation: React.FC<{ position: [number, number] | null }> = ({ position }) => {
    const map = useMap();

    useEffect(() => {
        if (position) {
            map.flyTo(position, 16, { duration: 1 });
        }
    }, [position, map]);

    return null;
};

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
    isOpen,
    onClose,
    onLocationSelect,
    initialLocation,
}) => {
    const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
    const [address, setAddress] = useState<string>('');
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Default to Tashkent
    const defaultCenter: [number, number] = [41.311081, 69.240562];

    // Initialize with saved location or initial location
    useEffect(() => {
        if (isOpen) {
            const saved = getSavedLocation();
            if (initialLocation) {
                setSelectedPosition([initialLocation.lat, initialLocation.lng]);
            } else if (saved) {
                setSelectedPosition([saved.lat, saved.lng]);
            }
        }
    }, [isOpen, initialLocation]);

    // Fetch address when position changes
    useEffect(() => {
        if (selectedPosition) {
            setIsLoadingAddress(true);
            getAddressFromCoordinates(selectedPosition[0], selectedPosition[1])
                .then((result) => {
                    setAddress(result.address);
                })
                .finally(() => {
                    setIsLoadingAddress(false);
                });
        }
    }, [selectedPosition]);

    const handleLocationClick = (lat: number, lng: number) => {
        setSelectedPosition([lat, lng]);
    };

    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsGettingCurrentLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setSelectedPosition([latitude, longitude]);
                    setIsGettingCurrentLocation(false);
                },
                (error) => {
                    // GPS xatosi - xaritadan tanlashni tavsiya qilamiz
                    setIsGettingCurrentLocation(false);
                    alert('Joylashuvni aniqlab bo\'lmadi. Iltimos, xaritadan tanlang.');
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Uzbekistan')}&limit=1`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setSelectedPosition([parseFloat(lat), parseFloat(lon)]);
            } else {
                alert('Manzil topilmadi. Boshqa so\'rov kiriting.');
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedPosition) return;

        const addressInfo = await getAddressFromCoordinates(selectedPosition[0], selectedPosition[1]);

        const locationData: LocationData = {
            lat: selectedPosition[0],
            lng: selectedPosition[1],
            address: addressInfo.address,
            city: addressInfo.city,
            district: addressInfo.district,
            country: addressInfo.country,
            timestamp: Date.now(),
            isManual: true,
        };

        saveLocation(locationData);
        onLocationSelect(locationData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="h-full flex flex-col bg-white dark:bg-gray-900">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white">Joylashuvni tanlang</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Xaritadan joyni bosing</p>
                        </div>
                    </div>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedPosition}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                    >
                        <Check size={18} />
                        Tasdiqlash
                    </button>
                </div>

                {/* Search bar */}
                <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Manzilni qidiring..."
                            className="w-full pl-10 pr-20 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isSearching ? '...' : 'Qidirish'}
                        </button>
                    </div>
                </div>

                {/* Map Container */}
                <div className="flex-1 relative">
                    <MapContainer
                        center={selectedPosition || defaultCenter}
                        zoom={selectedPosition ? 16 : 12}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationSelector
                            onLocationSelect={handleLocationClick}
                            selectedPosition={selectedPosition}
                        />
                        <FlyToLocation position={selectedPosition} />
                    </MapContainer>

                    {/* Current location button */}
                    <button
                        onClick={handleGetCurrentLocation}
                        disabled={isGettingCurrentLocation}
                        className="absolute bottom-24 right-4 z-[1000] p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        {isGettingCurrentLocation ? (
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Navigation size={24} className="text-blue-600" />
                        )}
                    </button>

                    {/* Crosshair indicator */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[500]">
                        <div className="w-6 h-6 border-2 border-blue-600 rounded-full opacity-30" />
                    </div>
                </div>

                {/* Selected address info */}
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <MapPin className="text-blue-600 dark:text-blue-400" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {selectedPosition ? 'Tanlangan manzil' : 'Manzil tanlanmagan'}
                            </p>
                            {isLoadingAddress ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                                    Manzil aniqlanmoqda...
                                </p>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {address || 'Xaritadan joyni tanlang'}
                                </p>
                            )}
                            {selectedPosition && (
                                <p className="text-xs text-gray-400 mt-1">
                                    📍 {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapLocationPicker;
