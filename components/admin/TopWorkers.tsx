import React from 'react';
import { Star, Users } from '../Icons';
import { WorkerProfile } from '../../types';

interface TopWorkersProps {
    workers: WorkerProfile[];
    customers?: Array<{ id: string; name: string; avatar?: string; orderCount: number }>;
}

export const TopWorkers: React.FC<TopWorkersProps> = ({ workers, customers = [] }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex gap-4 mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Star size={14} className="text-yellow-500" />
                    Top Ustalar
                </h3>
            </div>
            <div className="space-y-2">
                {workers.slice(0, 4).map((worker, idx) => (
                    <div key={worker.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div className="relative">
                            <img
                                src={worker.avatar || `https://ui-avatars.com/api/?name=${worker.name}&size=32`}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                            />
                            {idx < 3 && (
                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-700'}`}>
                                    {idx + 1}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-xs truncate">{worker.name}</p>
                        </div>
                        <div className="flex items-center gap-0.5 text-yellow-500">
                            <Star size={12} className="fill-current" />
                            <span className="font-bold text-xs">{worker.rating || '5.0'}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Top Customers section */}
            {customers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Users size={14} className="text-blue-500" />
                        Top Mijozlar
                    </h4>
                    <div className="space-y-2">
                        {customers.slice(0, 3).map((customer) => (
                            <div key={customer.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <img
                                    src={customer.avatar || `https://ui-avatars.com/api/?name=${customer.name}&size=32`}
                                    alt=""
                                    className="w-7 h-7 rounded-full object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-white text-xs truncate">{customer.name}</p>
                                </div>
                                <span className="text-xs font-bold text-blue-600">{customer.orderCount} ta</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
