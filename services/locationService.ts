// Joylashuv xizmati - GPS koordinatalarini olish va manzilga aylantirish

export interface LocationData {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    district?: string;
    country?: string;
    timestamp: number;
    isManual?: boolean; // Qo'lda kiritilganligini belgilash
}

// O'zbekiston viloyatlari va shaharlari
export const UZBEKISTAN_REGIONS: Record<string, string[]> = {
    "Toshkent shahri": ["Bektemir", "Chilonzor", "Mirzo Ulug'bek", "Mirobod", "Olmazor", "Sergeli", "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yunusobod", "Yashnobod"],
    "Toshkent viloyati": ["Angren", "Bekobod", "Olmaliq", "Chirchiq", "Nurafshon", "Ohangaron", "Yangiyo'l", "Bo'stonliq", "Qibray", "Zangiota", "Parkent"],
    "Samarqand viloyati": ["Samarqand", "Kattaqo'rg'on", "Urgut", "Jomboy", "Payariq", "Pastdarg'om", "Bulungur", "Ishtixon", "Nurobod"],
    "Buxoro viloyati": ["Buxoro", "Kogon", "G'ijduvon", "Jondor", "Qorovulbozor", "Olot", "Romitan", "Shofirkon", "Vobkent"],
    "Andijon viloyati": ["Andijon", "Asaka", "Xo'jaobod", "Shahrixon", "Qo'rg'ontepa", "Marhamat", "Oltinko'l", "Paxtaobod", "Bo'z"],
    "Farg'ona viloyati": ["Farg'ona", "Qo'qon", "Marg'ilon", "Quvasoy", "Rishton", "Beshariq", "Oltiariq", "Bog'dod", "Uchko'prik"],
    "Namangan viloyati": ["Namangan", "Chortoq", "Chust", "Kosonsoy", "Pop", "To'raqo'rg'on", "Uychi", "Yangiqo'rg'on", "Norin"],
    "Qashqadaryo viloyati": ["Qarshi", "Shahrisabz", "Koson", "Yakkabog'", "Muborak", "G'uzor", "Kasbi", "Kitob", "Chiroqchi"],
    "Surxondaryo viloyati": ["Termiz", "Denov", "Sherobod", "Boysun", "Qumqo'rg'on", "Angor", "Muzrabod", "Sariosiyo", "Oltinsoy"],
    "Xorazm viloyati": ["Urganch", "Xiva", "Bog'ot", "Gurlan", "Shovot", "Yangiariq", "Qo'shko'pir", "Xonqa", "Hazorasp"],
    "Navoiy viloyati": ["Navoiy", "Zarafshon", "Uchquduq", "Nurota", "Konimex", "Qiziltepa", "Xatirchi", "Navbahor"],
    "Jizzax viloyati": ["Jizzax", "G'allaorol", "Do'stlik", "Forish", "Mirzacho'l", "Paxtakor", "Yangiobod", "Zafarobod", "Zomin"],
    "Sirdaryo viloyati": ["Guliston", "Sirdaryo", "Boyovut", "Sayxunobod", "Oqoltin", "Xovos", "Mirzaobod"],
    "Qoraqalpog'iston": ["Nukus", "Mo'ynoq", "Xo'jayli", "Qo'ng'irot", "Beruniy", "Chimboy", "Taxtako'pir", "Ellikqal'a", "To'rtko'l"]
};

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

// Qo'lda joylashuvni sozlash
export const setManualLocation = (region: string, city: string): LocationData => {
    // Har bir viloyat uchun taxminiy koordinatalar
    const regionCoordinates: Record<string, { lat: number; lng: number }> = {
        "Toshkent shahri": { lat: 41.311081, lng: 69.240562 },
        "Toshkent viloyati": { lat: 41.316324, lng: 69.294406 },
        "Samarqand viloyati": { lat: 39.654278, lng: 66.959821 },
        "Buxoro viloyati": { lat: 39.767968, lng: 64.421904 },
        "Andijon viloyati": { lat: 40.782941, lng: 72.344304 },
        "Farg'ona viloyati": { lat: 40.383333, lng: 71.783333 },
        "Namangan viloyati": { lat: 40.998299, lng: 71.672472 },
        "Qashqadaryo viloyati": { lat: 38.860039, lng: 65.800903 },
        "Surxondaryo viloyati": { lat: 37.224808, lng: 67.278389 },
        "Xorazm viloyati": { lat: 41.550672, lng: 60.631539 },
        "Navoiy viloyati": { lat: 40.084883, lng: 65.379036 },
        "Jizzax viloyati": { lat: 40.115611, lng: 67.842267 },
        "Sirdaryo viloyati": { lat: 40.838350, lng: 68.665039 },
        "Qoraqalpog'iston": { lat: 42.460833, lng: 59.605556 }
    };

    const coords = regionCoordinates[region] || { lat: 41.311081, lng: 69.240562 };

    const location: LocationData = {
        lat: coords.lat,
        lng: coords.lng,
        address: `${city}, ${region}, O'zbekiston`,
        city: city,
        district: region,
        country: "O'zbekiston",
        timestamp: Date.now(),
        isManual: true
    };

    saveLocation(location);
    return location;
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
                    timestamp: Date.now(),
                    isManual: false
                };

                // Saqlash
                saveLocation(locationData);

                resolve(locationData);
            },
            (error) => {
                // GPS xatosi - bu normal holat, console ga yozmaymiz
                // Default Tashkent location ishlatiladi
                const defaultLocation: LocationData = {
                    lat: 41.311081,
                    lng: 69.240562,
                    address: 'Toshkent, O\'zbekiston',
                    city: 'Toshkent',
                    district: 'Markaz',
                    country: 'O\'zbekiston',
                    timestamp: Date.now(),
                    isManual: false
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
    // Qo'lda kiritilgan joylashuv hech qachon eskirmasin
    if (location.isManual) return false;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - location.timestamp > fiveMinutes;
};
