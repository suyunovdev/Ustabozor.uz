import React from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Briefcase } from '../Icons';

interface Activity {
    id: string;
    title: string;
    time: string;
    status: string;
}

interface RecentActivitiesProps {
    activities: Activity[];
}

export const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities }) => {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle size={14} className="text-green-500" />;
            case 'PENDING': return <Clock size={14} className="text-yellow-500" />;
            case 'CANCELLED': return <XCircle size={14} className="text-red-500" />;
            default: return <Briefcase size={14} className="text-blue-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        const labels: Record<string, string> = {
            PENDING: 'Kutilmoqda', IN_PROGRESS: 'Jarayonda', COMPLETED: 'Bajarilgan', CANCELLED: 'Bekor',
        };
        return (
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${styles[status] || 'bg-gray-100'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    So'nggi Faoliyatlar
                </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activities.length > 0 ? activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${activity.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30' :
                                activity.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                            {getStatusIcon(activity.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{activity.title}</p>
                            <p className="text-[10px] text-gray-500">{activity.time}</p>
                        </div>
                        {getStatusBadge(activity.status)}
                    </div>
                )) : (
                    <div className="col-span-2 text-center text-gray-400 py-4">Faoliyatlar yo'q</div>
                )}
            </div>
        </div>
    );
};
