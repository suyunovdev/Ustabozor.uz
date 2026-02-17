import React, { useEffect, useState, useCallback } from 'react';
import { MapView, MapMarker } from '../components/MapView';
import { ApiService } from '../services/api';
import { WorkerProfile, Order, OrderStatus } from '../types';
import { ArrowLeft, Users, Briefcase, MapPin, Navigation, Loader2, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type ViewType = 'workers' | 'jobs';

const isValidLocation = (lat?: number, lng?: number): boolean => {
    if (lat === undefined || lng === undefined) return false;
    return lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export const MapFinder = () => {
    const [workers, setWorkers] = useState<WorkerProfile[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [viewType, setViewType] = useState<ViewType>('jobs');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigate = useNavigate();

    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const isWorker = currentUser?.role === 'WORKER';

    useEffect(() => {
        setViewType(isWorker ? 'jobs' : 'workers');
    }, [isWorker]);

    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const [w, o] = await Promise.all([
                ApiService.getWorkers(),
                ApiService.getOrders()
            ]);
            setWorkers(w);
            setOrders(o.filter(o => o.status === OrderStatus.PENDING));
        } catch (err) {
            console.error('Map data load error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Faqat online ishchilar va faqat PENDING buyurtmalar
    const onlineWorkers = workers.filter(w => w.isOnline);

    const markers: MapMarker[] = viewType === 'workers'
        ? onlineWorkers
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

    const totalCount = viewType === 'workers' ? onlineWorkers.length : orders.length;
    const mapCount = markers.length;

    // Popup yoki marker bosilganda — to'g'ridan-to'g'ri sahifaga o'tish
    const handleMarkerClick = useCallback((marker: MapMarker) => {
        if (marker.type === 'worker') {
            navigate(`/profile/${marker.id}`);
        } else {
            navigate(`/orders/${marker.id}`);
        }
    }, [navigate]);

    return (
        <div className="flex flex-col bg-gray-50 dark:bg-gray-950 absolute inset-0 bottom-16">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-20 shrink-0">
                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                        <Link to={isWorker ? "/worker/home" : "/customer/home"} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
                        </Link>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Navigation size={18} className="text-blue-500" />
                            Xarita
                        </h1>
                    </div>
                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                        <RefreshCw size={18} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Toggle buttons */}
                <div className="flex bg-gray-100 dark:bg-gray-800 mx-3 mb-3 p-1 rounded-xl">
                    <button
                        onClick={() => setViewType('workers')}
                        className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${viewType === 'workers'
                            ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <Users size={15} />
                        Ishchilar
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${viewType === 'workers' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                            {mapCount}
                        </span>
                    </button>
                    <button
                        onClick={() => setViewType('jobs')}
                        className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${viewType === 'jobs'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <Briefcase size={15} />
                        Ishlar
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${viewType === 'jobs' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                            {mapCount}
                        </span>
                    </button>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <Loader2 size={32} className="text-blue-500 animate-spin" />
                        <p className="text-sm text-gray-500">Xarita yuklanmoqda...</p>
                    </div>
                ) : (
                    <MapView
                        height="100%"
                        markers={markers}
                        onMarkerClick={handleMarkerClick}
                        showUserLocation={true}
                    />
                )}

                {/* Ma'lumot yo'q */}
                {!loading && mapCount === 0 && (
                    <div className="absolute top-4 left-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg z-10 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl shrink-0">
                                <MapPin size={20} className="text-orange-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white text-sm">Joylashuv topilmadi</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {viewType === 'workers'
                                        ? totalCount === 0
                                            ? 'Hozirda online ishchi yo\'q'
                                            : `${totalCount} ta online ishchi bor, lekin joylashuvi aniqlanmagan`
                                        : totalCount === 0
                                            ? 'Hozirda kutilayotgan buyurtma yo\'q'
                                            : `${totalCount} ta buyurtma bor, lekin joylashuvi aniqlanmagan`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapFinder;
