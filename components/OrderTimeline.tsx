import React from 'react';
import { Clock, Calendar, Play, CheckCircle, AlertCircle } from 'lucide-react';

interface OrderTimelineProps {
    createdAt: string;
    acceptedAt?: string;
    startedAt?: string;
    completedAt?: string;
    status: string;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
    createdAt,
    acceptedAt,
    startedAt,
    completedAt,
    status
}) => {
    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString('uz-UZ', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }),
            time: date.toLocaleTimeString('uz-UZ', {
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    };

    const TimeItem = ({
        icon: Icon,
        label,
        dateStr,
        color,
        isActive = false
    }: {
        icon: any;
        label: string;
        dateStr?: string;
        color: string;
        isActive?: boolean;
    }) => {
        if (!dateStr) return null;

        const { date, time } = formatDateTime(dateStr);

        return (
            <div className={`flex items-start gap-3 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${color} flex items-center justify-center`}>
                    <Icon size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{time}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{date}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                <Clock size={12} />
                Vaqt jadvali
            </h4>

            <div className="space-y-3">
                <TimeItem
                    icon={Calendar}
                    label="E'lon qilingan"
                    dateStr={createdAt}
                    color="bg-blue-500"
                    isActive={true}
                />

                <TimeItem
                    icon={CheckCircle}
                    label="Qabul qilingan"
                    dateStr={acceptedAt}
                    color="bg-indigo-500"
                    isActive={!!acceptedAt}
                />

                <TimeItem
                    icon={Play}
                    label="Ish boshlangan"
                    dateStr={startedAt}
                    color="bg-purple-500"
                    isActive={!!startedAt}
                />

                <TimeItem
                    icon={CheckCircle}
                    label="Tugatilgan"
                    dateStr={completedAt}
                    color="bg-green-500"
                    isActive={!!completedAt}
                />

                {status === 'CANCELLED' && (
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                            <AlertCircle size={14} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-red-500">Bekor qilingan</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
