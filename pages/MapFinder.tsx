import React, { useEffect, useState } from 'react';
import { MapView, MapMarker } from '../components/MapView';
import { MockService } from '../services/mockDb';
import { WorkerProfile, Order, OrderStatus } from '../types';
import { ArrowLeft, Users, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

type ViewType = 'workers' | 'jobs';

export const MapFinder = () => {
    const [workers, setWorkers] = useState<WorkerProfile[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [viewType, setViewType] = useState<ViewType>('workers');
    const [selectedItem, setSelectedItem] = useState<MapMarker | null>(null);

    // Get current user
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const isWorker = currentUser?.role === 'WORKER';

    useEffect(() => {
        MockService.getWorkers().then(setWorkers);
        MockService.getOrders().then(orders => {
            setOrders(orders.filter(o => o.status === OrderStatus.PENDING));
        });
    }, []);

    // Generate markers based on view type
    const markers: MapMarker[] = viewType === 'workers'
        ? workers.map(worker => {
            // Use worker's actual location if available, otherwise use default Tashkent coordinates
            const lat = worker.location?.lat || 41.311081;
            const lng = worker.location?.lng || 69.240562;

            return {
                id: worker.id,
                position: [lat, lng] as [number, number],
                title: `${worker.name} ${worker.surname || ''}`,
                description: worker.skills.join(', '),
                type: 'worker' as const,
            };
        })
        : orders.map(order => {
            // Use order's actual GPS coordinates if available
            const lat = order.lat || 41.311081;
            const lng = order.lng || 69.240562;

            return {
                id: order.id,
                position: [lat, lng] as [number, number],
                title: order.title,
                description: order.description,
                price: order.price,
                category: order.category,
                type: 'job' as const,
            };
        });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Link to={isWorker ? "/worker/home" : "/customer/home"} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
                        </Link>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Xaritada qidirish</h1>
                    </div>
                </div>

                {/* Toggle buttons */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                        onClick={() => setViewType('workers')}
                        className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${viewType === 'workers'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <Users size={16} />
                        Ishchilar ({workers.length})
                    </button>
                    <button
                        onClick={() => setViewType('jobs')}
                        className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${viewType === 'jobs'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <Briefcase size={16} />
                        Ishlar ({orders.length})
                    </button>
                </div>
            </div>

            {/* Map */}
            <div className="p-4">
                <MapView
                    height="calc(100vh - 200px)"
                    markers={markers}
                    onMarkerClick={(marker) => setSelectedItem(marker)}
                    showUserLocation={true}
                />
            </div>

            {/* Selected item info */}
            {selectedItem && (
                <div className="fixed bottom-20 left-4 right-4 bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4 border border-gray-100 dark:border-gray-800 z-30 animate-slideUp">
                    <button
                        onClick={() => setSelectedItem(null)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                    {selectedItem.category && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full font-medium">
                            {selectedItem.category}
                        </span>
                    )}
                    <h3 className="font-bold text-gray-900 dark:text-white mt-2">{selectedItem.title}</h3>
                    {selectedItem.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedItem.description}</p>
                    )}
                    {selectedItem.price && (
                        <p className="text-green-600 dark:text-green-400 font-bold mt-2 text-lg">
                            {selectedItem.price.toLocaleString()} so'm
                        </p>
                    )}
                    <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
                        {viewType === 'workers' ? 'Bog\'lanish' : 'Batafsil'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MapFinder;
