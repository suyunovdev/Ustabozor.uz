import React from 'react';
import { Order } from '../../types';

interface RecentOrdersProps {
    orders: Order[];
    onViewAll?: () => void;
}

export const RecentOrders: React.FC<RecentOrdersProps> = ({ orders, onViewAll }) => {
    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            ACCEPTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        const labels: Record<string, string> = {
            PENDING: 'Kutilmoqda', ACCEPTED: 'Qabul qilindi', IN_PROGRESS: 'Jarayonda',
            COMPLETED: 'Bajarilgan', CANCELLED: 'Bekor',
        };
        return (
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${styles[status] || 'bg-gray-100'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Oxirgi Buyurtmalar</h3>
                {onViewAll && (
                    <button onClick={onViewAll} className="text-blue-600 dark:text-blue-400 text-xs font-medium hover:underline">
                        Barchasi
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase py-2.5 px-4">Buyurtma</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase py-2.5 px-4">Joylashuv</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase py-2.5 px-4">Narxi</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase py-2.5 px-4">Holati</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {orders.length > 0 ? orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="py-2.5 px-4">
                                    <p className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{order.title}</p>
                                </td>
                                <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400 text-xs truncate max-w-[100px]">{order.location}</td>
                                <td className="py-2.5 px-4 font-bold text-green-600 text-xs">{Number(order.price).toLocaleString()}</td>
                                <td className="py-2.5 px-4">{getStatusBadge(order.status)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="py-8 text-center text-gray-400">Buyurtmalar yo'q</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
