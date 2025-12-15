import React, { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Check, ChevronDown, Map } from 'lucide-react';
import {
    UZBEKISTAN_REGIONS,
    setManualLocation,
    requestUserLocation,
    getSavedLocation,
    saveLocation,
    getAddressFromCoordinates,
    LocationData
} from '../services/locationService';
import { toast } from 'react-toastify';
import { MapLocationPicker } from './MapLocationPicker';

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationChange: (location: LocationData) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, onLocationChange }) => {
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGpsLoading, setIsGpsLoading] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

    const regions = Object.keys(UZBEKISTAN_REGIONS);
    const cities = selectedRegion ? UZBEKISTAN_REGIONS[selectedRegion] : [];

    // Saqlangan joylashuvni yuklash
    useEffect(() => {
        if (isOpen) {
            const saved = getSavedLocation();
            setCurrentLocation(saved);
            if (saved && saved.district) {
                const foundRegion = regions.find(r =>
                    saved.district?.includes(r) ||
                    saved.address?.includes(r)
                );
                if (foundRegion) {
                    setSelectedRegion(foundRegion);
                    setTimeout(() => {
                        if (saved.city) {
                            setSelectedCity(saved.city);
                        }
                    }, 100);
                }
            }
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!selectedRegion || !selectedCity) {
            toast.error("Iltimos, viloyat va shaharni tanlang");
            return;
        }

        setIsLoading(true);

        try {
            const location = setManualLocation(selectedRegion, selectedCity);
            onLocationChange(location);
            toast.success(`📍 Joylashuv o'zgartirildi: ${selectedCity}, ${selectedRegion}`);
            onClose();
        } catch (error) {
            toast.error("Joylashuvni saqlashda xatolik");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGpsLocation = async () => {
        setIsGpsLoading(true);
        try {
            const location = await requestUserLocation();
            onLocationChange(location);
            toast.success(`📍 GPS joylashuv: ${location.city}, ${location.district || location.country}`);
            onClose();
        } catch (error) {
            toast.error("GPS joylashuvni aniqlab bo'lmadi");
        } finally {
            setIsGpsLoading(false);
        }
    };

    // Xaritadan joylashuv tanlanganda
    const handleMapLocationSelect = (location: LocationData) => {
        setCurrentLocation(location);
        onLocationChange(location);
        toast.success(`📍 Aniq joylashuv saqlandi: ${location.city || location.address}`);
        setShowMapPicker(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-scaleIn max-h-[90vh] overflow-y-auto">

                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white sticky top-0 z-10">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="flex items-center space-x-3">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Joylashuvni o'zgartirish</h2>
                                <p className="text-sm text-blue-100 mt-0.5">Aniq joylashuvingizni tanlang</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">

                        {/* Current Location Display */}
                        {currentLocation && (
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800/50">
                                <p className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                                    <MapPin size={16} className="text-green-500" />
                                    Hozirgi: {currentLocation.city || 'Noma\'lum'}, {currentLocation.district || currentLocation.country}
                                </p>
                                {currentLocation.lat && currentLocation.lng && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                        📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* MAP PICKER BUTTON - RECOMMENDED */}
                        <button
                            onClick={() => setShowMapPicker(true)}
                            className="w-full flex items-center justify-center space-x-2 py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
                        >
                            <Map size={20} />
                            <span>Xaritadan aniq joy tanlash</span>
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Tavsiya</span>
                        </button>

                        {/* GPS Button */}
                        <button
                            onClick={handleGpsLocation}
                            disabled={isGpsLoading}
                            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25 disabled:opacity-50"
                        >
                            {isGpsLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Navigation size={18} />
                            )}
                            <span>{isGpsLoading ? 'Aniqlanmoqda...' : 'GPS orqali aniqlash'}</span>
                        </button>

                        <div className="flex items-center space-x-3">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                            <span className="text-xs text-gray-400 font-medium uppercase">yoki qo'lda tanlang</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                        </div>

                        {/* Region Selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Viloyat
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedRegion}
                                    onChange={(e) => {
                                        setSelectedRegion(e.target.value);
                                        setSelectedCity('');
                                    }}
                                    className="w-full appearance-none px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                                >
                                    <option value="">Viloyatni tanlang</option>
                                    {regions.map((region) => (
                                        <option key={region} value={region}>{region}</option>
                                    ))}
                                </select>
                                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* City Selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Shahar / Tuman
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedCity}
                                    onChange={(e) => setSelectedCity(e.target.value)}
                                    disabled={!selectedRegion}
                                    className="w-full appearance-none px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">Shaharni tanlang</option>
                                    {cities.map((city) => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Selected Location Preview */}
                        {selectedRegion && selectedCity && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/50">
                                <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium flex items-center gap-2">
                                    <MapPin size={14} />
                                    {selectedCity}, {selectedRegion}
                                </p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                    ⚠️ Bu taxminiy koordinatalar - aniq joy uchun xaritadan tanlang
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 pt-0 flex space-x-3 sticky bottom-0 bg-white dark:bg-gray-900">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            Bekor qilish
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!selectedRegion || !selectedCity || isLoading}
                            className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Check size={18} />
                                    <span>Taxminiy</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Map Location Picker Modal */}
            <MapLocationPicker
                isOpen={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                onLocationSelect={handleMapLocationSelect}
                initialLocation={currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : undefined}
            />
        </>
    );
};
