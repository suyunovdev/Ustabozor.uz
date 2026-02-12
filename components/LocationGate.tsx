import React, { useState } from 'react';
import { MapPin, Navigation, AlertTriangle } from 'lucide-react';
import { requestLocationWithStatus, LocationData } from '../services/locationService';
import { LocationModal } from './LocationModal';

interface LocationGateProps {
    onLocationGranted: (location: LocationData) => void;
}

type GateScreen = 'requesting' | 'loading' | 'denied';

export const LocationGate: React.FC<LocationGateProps> = ({ onLocationGranted }) => {
    const [screen, setScreen] = useState<GateScreen>('requesting');
    const [showManualModal, setShowManualModal] = useState(false);

    const handleRequestPermission = async () => {
        setScreen('loading');
        try {
            const location = await requestLocationWithStatus();
            onLocationGranted(location);
        } catch {
            setScreen('denied');
        }
    };

    const handleManualLocation = (location: LocationData) => {
        setShowManualModal(false);
        onLocationGranted(location);
    };

    // Boshlang'ich — ruxsat so'rash
    if (screen === 'requesting') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 animate-fadeIn">
                <div className="w-28 h-28 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-blue-500/10">
                    <MapPin size={52} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
                    Joylashuvingizni aniqlang
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-sm leading-relaxed">
                    Yaqin atrofdagi ishlarni ko'rish va to'g'ri masofani hisoblash uchun joylashuvingizga ruxsat bering
                </p>
                <button
                    onClick={handleRequestPermission}
                    className="w-full max-w-sm py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.98]"
                >
                    <Navigation size={22} />
                    Joylashuvga ruxsat berish
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 text-center max-w-xs">
                    Joylashuvingiz faqat yaqin ishlarni ko'rsatish uchun ishlatiladi
                </p>
            </div>
        );
    }

    // Kutish
    if (screen === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fadeIn">
                <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Joylashuv aniqlanmoqda...</p>
            </div>
        );
    }

    // Rad etildi
    return (
        <>
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 animate-fadeIn">
                <div className="w-28 h-28 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-orange-500/10">
                    <AlertTriangle size={52} className="text-orange-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
                    Joylashuv ruxsati kerak
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-sm leading-relaxed">
                    Platformadan to'liq foydalanish uchun joylashuvingizni aniqlashimiz kerak. Brauzer sozlamalaridan ruxsat bering yoki qo'lda tanlang.
                </p>
                <div className="w-full max-w-sm space-y-3">
                    <button
                        onClick={handleRequestPermission}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                    >
                        <Navigation size={20} />
                        Qayta urinish
                    </button>
                    <button
                        onClick={() => setShowManualModal(true)}
                        className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                    >
                        <MapPin size={20} />
                        Qo'lda tanlash
                    </button>
                </div>
            </div>
            <LocationModal
                isOpen={showManualModal}
                onClose={() => setShowManualModal(false)}
                onLocationChange={handleManualLocation}
            />
        </>
    );
};
