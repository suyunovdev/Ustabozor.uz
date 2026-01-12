import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface OrderStatusChartProps {
    data: Array<{ name: string; value: number; color: string }>;
}

export const OrderStatusChart: React.FC<OrderStatusChartProps> = ({ data }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold mb-3 text-gray-900 dark:text-white">Buyurtmalar Holati</h3>
            {data.length > 0 ? (
                <>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {data.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></div>
                                <span className="text-xs text-gray-600 dark:text-gray-400">{s.name}: {s.value}</span>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Ma'lumot yo'q</div>
            )}
        </div>
    );
};
