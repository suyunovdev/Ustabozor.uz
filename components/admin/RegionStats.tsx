import React from 'react';
import { MapPin } from '../Icons';

interface RegionStatsProps {
    data: Array<{ name: string; value: number }>;
}

export const RegionStats: React.FC<RegionStatsProps> = ({ data }) => {
    const maxValue = data[0]?.value || 1;

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-500" />
                    Hududlar bo'yicha
                </h3>
            </div>
            <div className="space-y-3">
                {data.length > 0 ? data.map((region, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-500 w-5">{idx + 1}</span>
                        <div className="flex-1">
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{region.name}</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{region.value}</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                                    style={{ width: `${(region.value / maxValue) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Ma'lumot yo'q</div>
                )}
            </div>
        </div>
    );
};
