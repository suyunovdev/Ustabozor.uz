import React, { useEffect, useState, useCallback } from 'react';
import { MapView, MapMarker } from '../components/MapView';
import { MockService } from '../services/mockDb';
import { WorkerProfile, Order, OrderStatus } from '../types';
import { ArrowLeft, Users, Briefcase, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type ViewType = 'workers' | 'jobs';

// Koordinata yaroqliligini tekshirish
const isValidLocation = (lat?: number, lng?: number): boolean => {
    if (lat === undefined || lng === undefined) return false;
    return lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export const MapFinder = () => {
    const [workers, setWorkers] = useState<WorkerProfile[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [viewType, setViewType] = useState<ViewType>('workers');
    const [selectedItem, setSelectedItem] = useState<MapMarker | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Get current user
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const isWorker = currentUser?.role === 'WORKER';

    useEffect(() => {
        Promise.all([
            MockService.getWorkers(),
            MockService.getOrders()
        ]).then(([w, o]) => {
            setWorkers(w);
            setOrders(o.filter(o => o.status === OrderStatus.PENDING));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    // Faqat yaroqli joylashuvga ega markerlarni olish
    const markers: MapMarker[] = viewType === 'workers'
        ? workers
            .filter(w => isValidLocation(w.location?.lat, w.location?.lng))
            .map(worker => ({
                id: worker.id,
                position: [worker.location!.lat, worker.location!.lng] as [number, number],
                title: `${worker.name} ${worker.surname || ''}`.trim(),
                description: worker.skills?.length ? worker.skills.join(', ') : 'Ishchi',
                type: 'worker' as const,
            }))
        : orders
            .filter(o => isValidLocation(o.lat, o.lng))
            .map(order => ({
                id: order.id,
                position: [order.lat!, order.lng!] as [number, number],
                title: order.title,
                description: order.description,
                price: order.price,
                category: order.category,
                type: 'job' as const,
            }));

    // Umumiy va xaritadagi sonni hisoblash
    const totalCount = viewType === 'workers' ? workers.length : orders.length;
    const mapCount = markers.length;

    const handleMarkerClick = useCallback((marker: MapMarker) => {
        setSelectedItem(marker);
    }, []);

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-20 shrink-0">
                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                        <Link to={isWorker ? "/worker/home" : "/customer/home"} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
                        </Link>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Xaritada qidirish</h1>
                    </div>
                </div>

                {/* Toggle buttons */}
                <div className="flex bg-gray-100 dark:bg-gray-800 mx-3 mb-3 p-1 rounded-xl">
                    <button
                        onClick={() => { setViewType('workers'); setSelectedItem(null); }}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${viewType === 'workers'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <Users size={15} />
                        Ishchilar ({mapCount}{mapCount < totalCount ? `/${totalCount}` : ''})
                    </button>
                    <button
                        onClick={() => { setViewType('jobs'); setSelectedItem(null); }}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${viewType === 'jobs'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <Briefcase size={15} />
                        Ishlar ({mapCount}{mapCount < totalCount ? `/${totalCount}` : ''})
                    </button>
                </div>
            </div>

            {/* Map — qolgan barcha joyni egallaydi */}
            <div className="flex-1 relative">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <MapView
                        height="100%"
                        markers={markers}
                        onMarkerClick={handleMarkerClick}
                        showUserLocation={true}
                    />
                )}

                {/* Joylashuvlar yo'q bo'lsa bildirish */}
                {!loading && mapCount === 0 && (
                    <div className="absolute top-4 left-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-3 shadow-lg z-10">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <MapPin size={16} className="text-orange-500 shrink-0" />
                            <span>
                                {viewType === 'workers'
                                    ? `${totalCount} ta ishchi bor, lekin hech birining joylashuvi aniqlanmagan`
                                    : `${totalCount} ta ish bor, lekin hech birining joylashuvi aniqlanmagan`
                                }
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Selected item info — bottom sheet */}
            {selectedItem && (
                <div className="absolute bottom-16 left-3 right-3 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-30 animate-slideUp overflow-hidden">
                    <div className="p-4">
                        <button
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 hover:text-gray-600 text-sm"
                        >
                            ✕
                        </button>

                        <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl shrink-0 ${selectedItem.type === 'worker' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                {selectedItem.type === 'worker'
                                    ? <Users size={20} className="text-purple-600 dark:text-purple-400" />
                                    : <Briefcase size={20} className="text-blue-600 dark:text-blue-400" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                {selectedItem.category && (
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                                        {selectedItem.category}
                                    </span>
                                )}
                                <h3 className="font-bold text-gray-900 dark:text-white mt-1 truncate">{selectedItem.title}</h3>
                                {selectedItem.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{selectedItem.description}</p>
                                )}
                                {selectedItem.price != null && selectedItem.price > 0 && (
                                    <p className="text-green-600 dark:text-green-400 font-bold mt-1.5 text-lg">
                                        {selectedItem.price.toLocaleString()} so'm
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                if (viewType === 'workers') {
                                    navigate(`/profile/${selectedItem.id}`);
                                } else {
                                    navigate(`/orders/${selectedItem.id}`);
                                }
                            }}
                            className={`w-full mt-3 font-bold py-3 rounded-xl transition-colors ${
                                viewType === 'workers'
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {viewType === 'workers' ? "Profilni ko'rish" : 'Batafsil'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapFinder;
