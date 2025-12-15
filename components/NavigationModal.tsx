import React, { useState, useEffect } from 'react';
import { X, Navigation, MapPin, Clock, Car, PersonStanding, Bike, ExternalLink } from 'lucide-react';
import { getSavedLocation, LocationData } from '../services/locationService';

interface NavigationModalProps {
    isOpen: boolean;
    onClose: () => void;
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
}

// Ikki nuqta orasidagi masofani hisoblash (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth radius km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Taxminiy vaqtni hisoblash
const estimateTime = (distanceKm: number, mode: 'walk' | 'bike' | 'car'): string => {
    const speeds = { walk: 5, bike: 15, car: 40 }; // km/h
    const hours = distanceKm / speeds[mode];
    const minutes = Math.round(hours * 60);

    if (minutes < 60) {
        return `${minutes} daqiqa`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h} soat ${m} daqiqa`;
};

export const NavigationModal: React.FC<NavigationModalProps> = ({
    isOpen,
    onClose,
    destinationName,
    destinationLat,
    destinationLng
}) => {
    const [userLocation, setUserLocation] = useState<LocationData | null>(null);
    const [selectedMode, setSelectedMode] = useState<'walk' | 'bike' | 'car'>('car');
    const [distance, setDistance] = useState<number>(0);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Foydalanuvchi joylashuvini olish
            const saved = getSavedLocation();
            if (saved) {
                setUserLocation(saved);
                const dist = calculateDistance(saved.lat, saved.lng, destinationLat, destinationLng);
                setDistance(dist);
            } else {
                // GPS orqali aniqlaymiz
                setIsLoadingLocation(true);
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const loc: LocationData = {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            timestamp: Date.now()
                        };
                        setUserLocation(loc);
                        const dist = calculateDistance(loc.lat, loc.lng, destinationLat, destinationLng);
                        setDistance(dist);
                        setIsLoadingLocation(false);
                    },
                    () => {
                        // Default Tashkent
                        const loc: LocationData = { lat: 41.311081, lng: 69.240562, timestamp: Date.now() };
                        setUserLocation(loc);
                        const dist = calculateDistance(loc.lat, loc.lng, destinationLat, destinationLng);
                        setDistance(dist);
                        setIsLoadingLocation(false);
                    }
                );
            }
        }
    }, [isOpen, destinationLat, destinationLng]);

    // Xaritada ochish uchun linklar
    const openInGoogleMaps = () => {
        if (!userLocation) return;
        const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${destinationLat},${destinationLng}`;
        window.open(url, '_blank');
    };

    const openInYandexMaps = () => {
        if (!userLocation) return;
        const url = `https://yandex.com/maps/?rtext=${userLocation.lat},${userLocation.lng}~${destinationLat},${destinationLng}&rtt=auto`;
        window.open(url, '_blank');
    };

    const openIn2GIS = () => {
        if (!userLocation) return;
        const url = `https://2gis.uz/tashkent/directions/points/${userLocation.lng},${userLocation.lat};${destinationLng},${destinationLat}`;
        window.open(url, '_blank');
    };

    if (!isOpen) return null;

    const travelModes = [
        { id: 'walk' as const, icon: PersonStanding, label: 'Piyoda' },
        { id: 'bike' as const, icon: Bike, label: 'Velosiped' },
        { id: 'car' as const, icon: Car, label: 'Mashina' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slideUp">

                {/* Header with Map Preview */}
                <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Navigation size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Yo'nalish</h2>
                            <p className="text-sm text-blue-100">Manzilga qanday borish</p>
                        </div>
                    </div>

                    {/* Destination */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-red-300" />
                            <span className="text-sm font-medium truncate">{destinationName}</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">

                    {/* Distance & Time Info */}
                    {isLoadingLocation ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="ml-2 text-gray-500">Joylashuv aniqlanmoqda...</span>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                            <div className="text-center mb-4">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {distance.toFixed(1)} km
                                </span>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">masofa</p>
                            </div>

                            {/* Travel Mode Selection */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {travelModes.map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setSelectedMode(mode.id)}
                                        className={`p-3 rounded-xl text-center transition-all ${selectedMode === mode.id
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                                            }`}
                                    >
                                        <mode.icon size={20} className="mx-auto mb-1" />
                                        <span className="text-xs font-medium">{mode.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Estimated Time */}
                            <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                                <Clock size={16} className="text-blue-500" />
                                <span className="font-semibold">{estimateTime(distance, selectedMode)}</span>
                                <span className="text-gray-400">taxminan</span>
                            </div>
                        </div>
                    )}

                    {/* Map App Buttons */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-3">Xaritada ochish:</p>

                        <button
                            onClick={openInGoogleMaps}
                            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold">G</div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Google Maps</span>
                            </div>
                            <ExternalLink size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </button>

                        <button
                            onClick={openInYandexMaps}
                            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-red-500 dark:hover:border-red-500 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-yellow-500 rounded-xl flex items-center justify-center text-white font-bold">Y</div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Yandex Maps</span>
                            </div>
                            <ExternalLink size={18} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                        </button>

                        <button
                            onClick={openIn2GIS}
                            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-500 dark:hover:border-green-500 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold">2G</div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">2GIS</span>
                            </div>
                            <ExternalLink size={18} className="text-gray-400 group-hover:text-green-500 transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Close Button */}
                <div className="p-4 pt-0">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Yopish
                    </button>
                </div>
            </div>
        </div>
    );
};
