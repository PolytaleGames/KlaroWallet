import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { priceService } from '../services/priceService';
import { useTranslation } from 'react-i18next';

const AssetChart = ({ asset, onClose }) => {
    const { t } = useTranslation();
    const [range, setRange] = useState('1mo');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const ranges = [
        { id: '1d', label: '1J' },
        { id: '5d', label: '5J' },
        { id: '1mo', label: '1M' },
        { id: '6mo', label: '6M' },
        { id: 'ytd', label: 'YTD' },
        { id: '1y', label: '1A' },
        { id: '5y', label: '5A' },
        { id: 'max', label: 'MAX' }
    ];

    useEffect(() => {
        const fetchData = async () => {
            if (!asset?.ticker) return;

            setLoading(true);
            // Don't clear data immediately to prevent flash/layout shift

            const history = await priceService.getHistory(asset.ticker, range);

            if (history && history.length > 0) {
                setData(history);
                setError(null);
            } else {
                setError('No data available');
            }
            setLoading(false);
        };

        fetchData();
    }, [asset, range]);

    // Custom formatting for Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50">
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                        {new Date(label).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: (range === '1d' || range === '5d') ? '2-digit' : undefined,
                            minute: (range === '1d' || range === '5d') ? '2-digit' : undefined
                        })}
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">
                        {payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 2 })} {asset.originalCurrency || 'EUR'}
                    </p>
                </div>
            );
        }
        return null;
    };

    // calculate variation for current range
    const variation = data.length > 0
        ? ((data[data.length - 1].price - data[0].price) / data[0].price) * 100
        : 0;

    // Current price to display (use latest data point)
    const currentPrice = data.length > 0 ? data[data.length - 1].price : asset.originalUnitPrice;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl p-6 m-4">

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{asset.name}</h3>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold uppercase">{asset.ticker}</span>
                        </div>
                        {/* Always render this block to prevent layout shift */}
                        <div className="flex items-center gap-2 h-10">
                            {error ? (
                                <span className="text-rose-500 text-sm">{error}</span>
                            ) : (data.length > 0 || currentPrice) ? (
                                <>
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white transition-all">
                                        {Number(currentPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} {asset.originalCurrency || 'EUR'}
                                    </span>
                                    <span className={`text-sm font-bold px-2 py-1 rounded-lg transition-colors ${variation >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                        {variation >= 0 ? '+' : ''}{variation.toFixed(2)}% ({ranges.find(r => r.id === range)?.label})
                                    </span>
                                    {loading && <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin ml-2" />}
                                </>
                            ) : (
                                <div className="h-8 w-48 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X size={24} />
                    </button>
                </div>

                {/* Chart Area */}
                <div className="h-[300px] w-full mb-6 relative">
                    {/* Simplified loading state: rely on header spinner and keep old chart visible */}

                    {error ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Calendar size={48} className="mb-2 opacity-50" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={variation >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={variation >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip content={<CustomTooltip />} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    tickFormatter={(val) => {
                                        const d = new Date(val);
                                        if (range === '1d') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        if (range === '5d') return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
                                        if (range === '1mo' || range === '6mo' || range === 'ytd') return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                                        if (range === '1y') return d.toLocaleDateString(undefined, { month: 'short' });
                                        if (range === '5y' || range === 'max') return d.getFullYear();
                                        return d.toLocaleDateString(undefined, { month: 'short' });
                                    }}
                                    minTickGap={50}
                                    interval="preserveStart"
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    hide
                                />
                                <Area
                                    type="monotone"
                                    dataKey="price"
                                    stroke={variation >= 0 ? "#10b981" : "#f43f5e"}
                                    fillOpacity={1}
                                    fill="url(#colorPrice)"
                                    strokeWidth={3}
                                    animationDuration={300}
                                    animationEasing="ease-in-out"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Range Selector */}
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl w-fit mx-auto">
                    {ranges.map(r => (
                        <button
                            key={r.id}
                            onClick={() => setRange(r.id)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${range === r.id
                                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

            </div>
        </div>,
        document.body
    );
};

export default AssetChart;
