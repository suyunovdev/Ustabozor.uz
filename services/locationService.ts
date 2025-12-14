// Joylashuv xizmati - GPS koordinatalarini olish va manzilga aylantirish

export interface LocationData {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    district?: string;
    country?: string;
    timestamp: number;
}

// Joylashuvni localStorage dan olish
export const getSavedLocation = (): LocationData | null => {
    const saved = localStorage.getItem('userLocation');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return null;
        }
    }
    return null;
};

// Joylashuvni localStorage ga saqlash
export const saveLocation = (location: LocationData): void => {
    localStorage.setItem('userLocation', JSON.stringify(location));
};

// Reverse geocoding - koordinatalardan manzil olish (Nominatim - bepul)
export const getAddressFromCoordinates = async (lat: number, lng: number): Promise<{
    address: string;
    city: string;
    district: string;
    country: string;
}> => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz`
        );
        const data = await response.json();

        return {
            address: data.display_name || 'Noma\'lum manzil',
            city: data.address?.city || data.address?.town || data.address?.village || 'Toshkent',
            district: data.address?.suburb || data.address?.neighbourhood || data.address?.district || '',
            country: data.address?.country || 'O\'zbekiston'
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        return {
            address: 'Manzil aniqlanmadi',
            city: 'Toshkent',
            district: '',
            country: 'O\'zbekiston'
        };
    }
};

// Foydalanuvchi joylashuvini so'rash va olish
export const requestUserLocation = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // Manzilni olish
                const addressInfo = await getAddressFromCoordinates(latitude, longitude);

                const locationData: LocationData = {
                    lat: latitude,
                    lng: longitude,
                    address: addressInfo.address,
                    city: addressInfo.city,
                    district: addressInfo.district,
                    country: addressInfo.country,
                    timestamp: Date.now()
                };

                // Saqlash
                saveLocation(locationData);

                resolve(locationData);
            },
            (error) => {
                console.error('Location error:', error);
                // Default Tashkent location
                const defaultLocation: LocationData = {
                    lat: 41.311081,
                    lng: 69.240562,
                    address: 'Toshkent, O\'zbekiston',
                    city: 'Toshkent',
                    district: 'Markaz',
                    country: 'O\'zbekiston',
                    timestamp: Date.now()
                };
                saveLocation(defaultLocation);
                resolve(defaultLocation);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 daqiqa cache
            }
        );
    });
};

// Joylashuv yangilanganligini tekshirish (5 daqiqadan oshgan bo'lsa yangilash kerak)
export const isLocationStale = (location: LocationData | null): boolean => {
    if (!location) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - location.timestamp > fiveMinutes;
};
