import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Wallet, Settings, Upload, Download, Save, CheckCircle, AlertCircle, X, PieChart, CreditCard, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { persistenceService } from '../services/persistenceService';
import { calculateMonthsRemaining, calculatePrincipal } from '../utils/financeUtils';
import Budget from './Budget';
import DebtManager from './DebtManager';
import AssetManager from './AssetManager';
import EventManager from './EventManager';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [showSettings, setShowSettings] = useState(false);

    // Unified State
    const [data, setData] = useState({
        assets: [],
        budget: {
            values: {},
            incomeCategories: [
                { id: 'inc_salary', name: 'Salary', icon: 'Briefcase' },
                { id: 'inc_bonus', name: 'Bonus', icon: 'Star' }
            ],
            expenseCategories: [
                { id: 'exp_rent', name: 'Rent', icon: 'Home' },
                { id: 'exp_food', name: 'Groceries', icon: 'ShoppingCart' }
            ]
        },
        debts: [],
        events: [], // Future events
        settings: { currency: 'EUR' }
    });

    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error

    // Load Data on Mount
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const loadedData = await persistenceService.loadData();
                // Ensure events array exists (migration for existing users)
                if (!loadedData.events) loadedData.events = [];
                setData(loadedData);
            } catch (e) {
                console.error("Failed to load data", e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    // Auto-Save Effect (Debounced)
    useEffect(() => {
        if (isLoading) return;

        const timer = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                await persistenceService.saveData(data);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } catch (e) {
                console.error("Auto-save failed", e);
                setSaveStatus('error');
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [data, isLoading]);

    // Handlers
    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const importedData = await persistenceService.importData(file);
            setData(importedData);
            alert('Data imported successfully!');
            setShowSettings(false);
        } catch (err) {
            alert('Failed to import data: ' + err.message);
        }
    };

    const handleExport = () => {
        persistenceService.exportData(data);
    };

    const [projectionMonths, setProjectionMonths] = useState(12);

    const updateAssets = (newAssets) => {
        setData(prev => ({ ...prev, assets: newAssets }));
    };

    // Event Handlers
    const handleAddEvent = (event) => {
        setData(prev => ({ ...prev, events: [...(prev.events || []), event] }));
    };

    const handleRemoveEvent = (id) => {
        setData(prev => ({ ...prev, events: prev.events.filter(e => e.id !== id) }));
    };

    const handleUpdateEvent = (updatedEvent) => {
        setData(prev => ({
            ...prev,
            events: prev.events.map(e => e.id === updatedEvent.id ? updatedEvent : e)
        }));
    };

    // --- Financial Projections ---
    const projection = useMemo(() => {
        if (isLoading) return { data: [], stats: {} };

        const today = new Date();
        const projectionData = [];

        // 1. Current State
        const currentAssets = (data.assets || []).reduce((sum, a) => sum + (Number(a.value) || 0), 0);

        const currentDebts = (data.debts || []).map(d => ({
            ...d,
            remainingMonths: calculateMonthsRemaining(d.endDate),
            monthlyCost: Number(d.monthlyPayment) + Number(d.insurance || 0)
        }));

        const totalDebtPrincipal = currentDebts.reduce((sum, d) =>
            sum + calculatePrincipal(Number(d.monthlyPayment), Number(d.rate), d.remainingMonths), 0);

        // Budget Monthly Flow
        const monthlyIncome = (data.budget?.incomeCategories || []).reduce((sum, c) => sum + (Number(data.budget?.values?.[c.id]) || 0), 0);
        const monthlyExpenses = (data.budget?.expenseCategories || []).reduce((sum, c) => sum + (Number(data.budget?.values?.[c.id]) || 0), 0);

        let runningAssets = currentAssets;

        // Loop from 0 to projectionMonths
        for (let i = 0; i <= projectionMonths; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

            // Calculate Debt Payments for this month
            let monthlyDebtPayments = 0;

            currentDebts.forEach(d => {
                if (i < d.remainingMonths) {
                    monthlyDebtPayments += d.monthlyCost;
                }
            });

            // Calculate Event Impacts for this month
            let monthlyEventsImpact = 0;
            (data.events || []).forEach(event => {
                const eventDate = new Date(event.date);
                const eventStartMonthIndex = (eventDate.getFullYear() - today.getFullYear()) * 12 + (eventDate.getMonth() - today.getMonth());

                // If event starts in the future or this month
                if (i >= eventStartMonthIndex) {
                    // Check recurrence
                    if (event.recurrence === 'none') {
                        if (i === eventStartMonthIndex) monthlyEventsImpact += Number(event.amount);
                    } else if (event.recurrence === 'monthly') {
                        monthlyEventsImpact += Number(event.amount);
                    } else if (event.recurrence === 'yearly') {
                        if ((i - eventStartMonthIndex) % 12 === 0) monthlyEventsImpact += Number(event.amount);
                    } else if (event.recurrence === 'custom') {
                        if ((i - eventStartMonthIndex) % event.interval === 0) monthlyEventsImpact += Number(event.amount);
                    }
                }
            });

            const monthlySurplus = monthlyIncome - monthlyExpenses - monthlyDebtPayments + monthlyEventsImpact;

            // Update Running Totals (starting from month 1)
            if (i > 0) {
                runningAssets += monthlySurplus;
            }

            // Calculate Remaining Debt Principal at month i
            const runningDebtPrincipal = currentDebts.reduce((sum, d) =>
                sum + calculatePrincipal(Number(d.monthlyPayment), Number(d.rate), Math.max(0, d.remainingMonths - i)), 0);

            projectionData.push({
                name: monthLabel,
                Assets: Math.round(runningAssets),
                Debt: Math.round(runningDebtPrincipal),
                NetWorth: Math.round(runningAssets - runningDebtPrincipal)
            });
        }

        return {
            data: projectionData,
            stats: {
                netWorth: currentAssets - totalDebtPrincipal,
                totalAssets: currentAssets,
                totalDebt: totalDebtPrincipal,
                monthlySurplus: monthlyIncome - monthlyExpenses - currentDebts.reduce((sum, d) => sum + d.monthlyCost, 0)
            }
        };

    }, [data, isLoading, projectionMonths]);

    // Helper for Split Gradient
    const gradientOffset = useMemo(() => {
        if (!projection.data || projection.data.length === 0) return 0;

        const dataMax = Math.max(...projection.data.map((i) => i.NetWorth));
        const dataMin = Math.min(...projection.data.map((i) => i.NetWorth));

        if (dataMax <= 0) return 0;
        if (dataMin >= 0) return 1;

        return dataMax / (dataMax - dataMin);
    }, [projection.data]);

    const off = gradientOffset;

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-400">Loading Klaro...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* Sidebar */}
            <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20 transition-all duration-300">
                <div className="p-6 flex items-center justify-center lg:justify-start gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-lg">K</div>
                    <span className="font-bold text-xl hidden lg:block">Klaro</span>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-6">
                    <button onClick={() => setActiveTab('overview')} className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <LayoutDashboard size={20} />
                        <span className="font-medium hidden lg:block">Overview</span>
                    </button>
                    <button onClick={() => setActiveTab('budget')} className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${activeTab === 'budget' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <PieChart size={20} />
                        <span className="font-medium hidden lg:block">Budget</span>
                    </button>
                    <button onClick={() => setActiveTab('planning')} className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${activeTab === 'planning' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <Calendar size={20} />
                        <span className="font-medium hidden lg:block">Planning</span>
                    </button>
                    <button onClick={() => setActiveTab('assets')} className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${activeTab === 'assets' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <Wallet size={20} />
                        <span className="font-medium hidden lg:block">Assets</span>
                    </button>
                    <button onClick={() => setActiveTab('debts')} className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${activeTab === 'debts' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <CreditCard size={20} />
                        <span className="font-medium hidden lg:block">Debts</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button onClick={() => setShowSettings(true)} className="w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
                        <Settings size={20} />
                        <span className="font-medium hidden lg:block">Settings</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-20 lg:ml-64 p-8 transition-all duration-300">
                {/* Header with Save Status */}
                <div className="flex justify-end mb-4">
                    <div className={`flex items-center gap-2 text-sm font-medium transition-opacity duration-500 ${saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                        {saveStatus === 'saving' && <span className="text-slate-400 flex items-center gap-1"><Save size={14} className="animate-pulse" /> Saving...</span>}
                        {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle size={14} /> Saved</span>}
                        {saveStatus === 'error' && <span className="text-rose-500 flex items-center gap-1"><AlertCircle size={14} /> Save Failed</span>}
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <header className="flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">Financial Overview</h1>
                                <p className="text-slate-500 mt-1">Your wealth projection based on current budget and assets.</p>
                            </div>

                            {/* Duration Selector */}
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                {[
                                    { label: '6M', value: 6 },
                                    { label: '1Y', value: 12 },
                                    { label: '2Y', value: 24 },
                                    { label: '4Y', value: 48 },
                                    { label: '10Y', value: 120 }
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setProjectionMonths(opt.value)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${projectionMonths === opt.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </header>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                <p className="text-slate-400 text-sm font-medium mb-2">Net Worth</p>
                                <h3 className="text-3xl font-bold">{Math.round(projection.stats.netWorth).toLocaleString()}€</h3>
                                <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
                                    <TrendingUp size={100} />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-slate-500 text-sm font-medium mb-2">Total Assets</p>
                                <h3 className="text-2xl font-bold text-slate-900">{Math.round(projection.stats.totalAssets).toLocaleString()}€</h3>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-slate-500 text-sm font-medium mb-2">Total Debt</p>
                                <h3 className="text-2xl font-bold text-slate-900">{Math.round(projection.stats.totalDebt).toLocaleString()}€</h3>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-slate-500 text-sm font-medium mb-2">Monthly Surplus</p>
                                <h3 className={`text-2xl font-bold ${projection.stats.monthlySurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {projection.stats.monthlySurplus > 0 ? '+' : ''}{Math.round(projection.stats.monthlySurplus).toLocaleString()}€
                                </h3>
                            </div>
                        </div>

                        {/* Projection Chart */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Wealth Projection</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={projection.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset={off} stopColor="#10b981" stopOpacity={1} />
                                                <stop offset={off} stopColor="#f43f5e" stopOpacity={1} />
                                            </linearGradient>
                                            <linearGradient id="splitColorFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset={off} stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset={off} stopColor="#f43f5e" stopOpacity={0.3} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            dy={10}
                                            minTickGap={50}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            tickFormatter={(value) => `${value / 1000}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value, name) => [
                                                <span className={name === 'NetWorth' ? (value >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold') : ''}>
                                                    {value.toLocaleString()}€
                                                </span>,
                                                name === 'NetWorth' ? 'Net Worth' : name
                                            ]}
                                            labelStyle={{ color: '#64748b', marginBottom: '0.5rem' }}
                                        />
                                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                                        <Area
                                            type="monotone"
                                            dataKey="NetWorth"
                                            stroke="url(#splitColor)"
                                            strokeWidth={3}
                                            fill="url(#splitColorFill)"
                                            animationDuration={1500}
                                            animationEasing="ease-in-out"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'planning' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <EventManager
                            events={data.events || []}
                            onAddEvent={handleAddEvent}
                            onRemoveEvent={handleRemoveEvent}
                            onUpdateEvent={handleUpdateEvent}
                        />
                    </div>
                )}

                {activeTab === 'assets' && (
                    <AssetManager
                        assets={data.assets}
                        onAddAsset={(asset) => updateAssets([...data.assets, asset])}
                        onRemoveAsset={(id) => updateAssets(data.assets.filter(a => a.id !== id))}
                        onUpdateAsset={(id, updated) => updateAssets(data.assets.map(a => a.id === id ? updated : a))}
                    />
                )}

                {activeTab === 'budget' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Budget
                            values={data.budget?.values || {}}
                            incomeCategories={data.budget?.incomeCategories || []}
                            expenseCategories={data.budget?.expenseCategories || []}
                            debts={data.debts || []}
                            onValueChange={(id, value) => {
                                setData(prev => ({
                                    ...prev,
                                    budget: {
                                        ...prev.budget,
                                        values: { ...prev.budget.values, [id]: Number(value) }
                                    }
                                }));
                            }}
                            onAddCategory={(type, name, icon) => {
                                const newCat = { id: `${type.substring(0, 3)}_${Date.now()}`, name, icon: icon || 'MoreHorizontal' };
                                setData(prev => ({
                                    ...prev,
                                    budget: {
                                        ...prev.budget,
                                        [type === 'income' ? 'incomeCategories' : 'expenseCategories']: [
                                            ...(prev.budget[type === 'income' ? 'incomeCategories' : 'expenseCategories'] || []),
                                            newCat
                                        ]
                                    }
                                }));
                            }}
                            onUpdateCategory={(type, id, updates) => {
                                const key = type === 'income' ? 'incomeCategories' : 'expenseCategories';
                                setData(prev => ({
                                    ...prev,
                                    budget: {
                                        ...prev.budget,
                                        [key]: prev.budget[key].map(c => c.id === id ? { ...c, ...updates } : c)
                                    }
                                }));
                            }}
                            onRemoveCategory={(type, id) => {
                                const key = type === 'income' ? 'incomeCategories' : 'expenseCategories';
                                setData(prev => ({
                                    ...prev,
                                    budget: {
                                        ...prev.budget,
                                        [key]: prev.budget[key].filter(c => c.id !== id)
                                    }
                                }));
                            }}
                            onReorderCategoryList={(type, newList) => {
                                const key = type === 'income' ? 'incomeCategories' : 'expenseCategories';
                                setData(prev => ({
                                    ...prev,
                                    budget: {
                                        ...prev.budget,
                                        [key]: newList
                                    }
                                }));
                            }}
                        />
                    </div>
                )}

                {activeTab === 'debts' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <DebtManager
                            debts={data.debts || []}
                            onAddDebt={(debt) => setData(prev => ({ ...prev, debts: [...prev.debts, debt] }))}
                            onRemoveDebt={(id) => setData(prev => ({ ...prev, debts: prev.debts.filter(d => d.id !== id) }))}
                            onUpdateDebt={(id, updates) => setData(prev => ({ ...prev, debts: prev.debts.map(d => d.id === id ? { ...d, ...updates } : d) }))}
                        />
                    </div>
                )}
            </main>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Settings</h3>
                            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <h4 className="font-bold text-slate-900 mb-2">Data Management</h4>
                                <p className="text-sm text-slate-500 mb-4">Export your data to keep a safe backup, or import data from another device.</p>

                                <div className="flex gap-3">
                                    <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                                        <Download size={18} /> Export
                                    </button>
                                    <label className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors cursor-pointer">
                                        <Upload size={18} /> Import
                                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-xs text-slate-400">Klaro v0.1.0 • Local Storage Only</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
