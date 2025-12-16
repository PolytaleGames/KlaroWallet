import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { LayoutDashboard, Wallet, Settings, Upload, Download, Save, CheckCircle, AlertCircle, X, PieChart, CreditCard, TrendingUp, TrendingDown, DollarSign, Calendar, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { persistenceService } from '../services/persistenceService';
import { calculateMonthsRemaining, calculatePrincipal } from '../utils/financeUtils';
import Budget from './Budget';
import DebtManager from './DebtManager';
import AssetManager from './AssetManager';
import EventManager from './EventManager';
import InvestmentPlan from './InvestmentPlan';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const Dashboard = () => {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('overview');
    const [showSettings, setShowSettings] = useState(false);

    // Config Popup State
    const [showYields, setShowYields] = useState(false);
    const yieldPopupRef = useRef(null);

    // Click Outside Handler for Yield Popup
    useEffect(() => {
        function handleClickOutside(event) {
            if (yieldPopupRef.current && !yieldPopupRef.current.contains(event.target)) {
                setShowYields(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

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
        investmentGoal: 0,
        investmentGoal: 0,
        settings: { currency: 'EUR' },
        investmentTargets: { stock: 50, crypto: 30, metal: 10, cash: 10 },
        investmentStrategy: 'active',
        assetYields: { stock: 7, crypto: 5, real_estate: 3, metal: 2, cash: 0, other: 0 }
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

    const [duration, setDuration] = useState({ years: 1, months: 0 });
    const projectionMonths = Math.max(1, duration.years * 12 + duration.months);
    const [projectionYield, setProjectionYield] = useState(5); // Annual Yield %

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

    // --- Financial Projections (Bucket System) ---
    const projection = useMemo(() => {
        if (isLoading) return { data: [], stats: {} };

        const today = new Date();
        const projectionData = [];

        // 1. Initialize Buckets (Current Assets)
        const buckets = { stock: 0, crypto: 0, metal: 0, cash: 0, real_estate: 0, other: 0 };
        // Basis tracks the "invested amount" (initial value + contributions) to calculate unrealized gains
        const basis = { stock: 0, crypto: 0, metal: 0, cash: 0, real_estate: 0, other: 0 };

        (data.assets || []).forEach(a => {
            const val = Number(a.value) || (Number(a.quantity) * Number(a.unitPrice)) || 0;
            const type = a.type || 'other';

            // For Basis (Invested Capital): Use costPrice if available and explicitly quantified
            const cost = (a.isQuantified && a.costPrice)
                ? (Number(a.costPrice) * Number(a.quantity))
                : val; // Fallback to current value if no cost basis known

            if (buckets[type] !== undefined) {
                buckets[type] += val;
                basis[type] += cost;
            } else {
                buckets['other'] += val;
                basis['other'] += cost;
            }
        });

        // Current Debt
        const currentDebts = (data.debts || []).map(d => ({
            ...d,
            remainingMonths: calculateMonthsRemaining(d.endDate),
            monthlyCost: Number(d.monthlyPayment) + Number(d.insurance || 0)
        }));

        const totalDebtPrincipal = currentDebts.reduce((sum, d) =>
            sum + calculatePrincipal(Number(d.monthlyPayment), Number(d.rate), d.remainingMonths), 0);

        const totalDebtPayments = currentDebts.reduce((sum, d) => sum + (d.monthlyCost * d.remainingMonths), 0);
        const totalInterest = totalDebtPayments - totalDebtPrincipal;

        // Baseline Flows
        const monthlyIncome = (data.budget?.incomeCategories || []).reduce((sum, c) => sum + (Number(data.budget?.values?.[c.id]) || 0), 0);
        const monthlyExpenses = (data.budget?.expenseCategories || []).reduce((sum, c) => sum + (Number(data.budget?.values?.[c.id]) || 0), 0);
        const investmentGoal = data.investmentGoal || 0;
        const targets = data.investmentTargets || { stock: 25, crypto: 25, metal: 25, cash: 25 };
        const totalTarget = Math.max(1, Object.values(targets).reduce((a, b) => a + b, 0)); // Avoid div/0
        const yields = data.assetYields || { stock: 7, crypto: 5, real_estate: 3, metal: 2, cash: 0, other: 0 };


        // Simulation Loop
        for (let i = 0; i <= projectionMonths; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const monthLabel = date.toLocaleDateString(i18n.language, { month: 'short', year: '2-digit' });

            // A. Debt Logic (Payments reduce principal)
            let monthlyDebtPayments = 0;
            currentDebts.forEach(d => {
                if (i < d.remainingMonths) monthlyDebtPayments += d.monthlyCost;
            });
            const runningDebtPrincipal = currentDebts.reduce((sum, d) =>
                sum + calculatePrincipal(Number(d.monthlyPayment), Number(d.rate), Math.max(0, d.remainingMonths - i)), 0);

            // B. Events Impact
            let monthlyEventsImpact = 0;
            (data.events || []).forEach(event => {
                const eventDate = new Date(event.date);
                const eventStartMonthIndex = (eventDate.getFullYear() - today.getFullYear()) * 12 + (eventDate.getMonth() - today.getMonth());
                if (i >= eventStartMonthIndex) {
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

            // C. Monthly Cash Flow (Surplus)
            // Income - Living Expenses - Debt Payments + One-offs
            const totalOutflows = monthlyExpenses + monthlyDebtPayments;
            const netCashFlow = monthlyIncome - totalOutflows + monthlyEventsImpact;

            // Available to Invest?
            // User sets "Investment Goal" which is PART of the outflow usually, or separate?
            // In Budget.jsx, Investment IS NOT an expense category, it's parallel.
            // So: Available Cash = NetCashFlow.
            // We deduct InvestmentGoal from Available Cash to put into Investment Buckets.
            // Remaining goes to Cash Bucket.

            // Wait, if NetCashFlow < InvestmentGoal, we are in deficit? 
            // We assume InvestmentGoal is respected if funds allow.

            if (i > 0) {
                // D. Grow Buckets (Compound Interest)
                Object.keys(buckets).forEach(key => {
                    const monthlyRate = ((yields[key] || 0) / 100) / 12;
                    buckets[key] += buckets[key] * monthlyRate;
                });

                // E. Inject Investment
                const amountToInvest = Math.min(Math.max(0, netCashFlow), investmentGoal);
                const amountToCash = Math.max(0, netCashFlow - investmentGoal);

                // Distribute Investment Amount based on Targets
                ['stock', 'crypto', 'metal', 'cash'].forEach(key => { // Only liquid targets
                    const targetShare = (targets[key] || 0) / totalTarget;
                    const investedAmount = amountToInvest * targetShare;
                    buckets[key] += investedAmount;
                    basis[key] += investedAmount; // Basis grows by contribution
                });

                // Savings (Surplus) goes to Cash
                buckets['cash'] += amountToCash;
                basis['cash'] += amountToCash; // Cash basis grows 1:1

                // Handle Deficits? If NetCashFlow < 0, subtract from Cash?
                if (netCashFlow < 0) {
                    buckets['cash'] += netCashFlow; // Reduces cash
                    basis['cash'] += netCashFlow;   // Reduces basis
                }
            }

            const totalAssets = Object.values(buckets).reduce((a, b) => a + b, 0);
            const totalBasis = Object.values(basis).reduce((a, b) => a + b, 0);
            const unrealizedGain = totalAssets - totalBasis;

            projectionData.push({
                name: monthLabel,
                Assets: Math.round(totalAssets),
                Debt: Math.round(runningDebtPrincipal),
                NetWorth: Math.round(totalAssets - runningDebtPrincipal),
                UnrealizedGain: Math.round(unrealizedGain),
                ...Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, Math.round(v)]))
            });
        }

        const currentTotalAssets = (data.assets || []).reduce((sum, a) => sum + (Number(a.value) || 0), 0);
        const finalBuckets = projectionData.length > 0 ? projectionData[projectionData.length - 1] : {};

        return {
            data: projectionData,
            stats: {
                netWorth: currentTotalAssets - totalDebtPrincipal,
                totalAssets: currentTotalAssets,
                totalDebt: totalDebtPrincipal,
                totalInterest: totalInterest,
                monthlySurplus: monthlyIncome - monthlyExpenses - currentDebts.reduce((sum, d) => sum + d.monthlyCost, 0),
                savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses - currentDebts.reduce((sum, d) => sum + d.monthlyCost, 0) + investmentGoal) / monthlyIncome) * 100 : 0,
                finalBuckets
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

        // Fix: Use a small epsilon to avoid floating point glitches near 0
        const offset = dataMax / (dataMax - dataMin);
        return Math.min(Math.max(offset, 0), 1);
    }, [projection.data]);

    const off = gradientOffset;

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 text-slate-400">{t('loading')}</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans text-slate-900 dark:text-white">
            {/* Sidebar */}
            <aside className="w-20 lg:w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col fixed h-full z-20 transition-all duration-300">
                <div className="p-6 flex items-center justify-center lg:justify-start gap-3">
                    <div className="w-8 h-8 bg-slate-900 dark:bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">K</div>
                    <span className="font-bold text-xl hidden lg:block dark:text-white">Klaro</span>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-6">
                    <button onClick={() => setActiveTab('overview')} className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-indigo-600 dark:shadow-indigo-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}>
                        <LayoutDashboard size={20} />
                        <span className="font-medium hidden lg:block">{t('overview')}</span>
                    </button>
                    <button onClick={() => setActiveTab('budget')} className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${activeTab === 'budget' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-indigo-600 dark:shadow-indigo-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}>
                        <PieChart size={20} />
                        <span className="font-medium hidden lg:block">{t('budget')}</span>
                    </button>
                    <button onClick={() => setActiveTab('planning')} className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${activeTab === 'planning' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-indigo-600 dark:shadow-indigo-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}>
                        <Calendar size={20} />
                        <span className="font-medium hidden lg:block">{t('planning')}</span>
                    </button>
                    <button onClick={() => setActiveTab('invest')} className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${activeTab === 'invest' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-indigo-600 dark:shadow-indigo-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}>
                        <Target size={20} />
                        <span className="font-medium hidden lg:block">{t('investment_plan')}</span>
                    </button>
                    <button onClick={() => setActiveTab('assets')} className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${activeTab === 'assets' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-indigo-600 dark:shadow-indigo-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}>
                        <Wallet size={20} />
                        <span className="font-medium hidden lg:block">{t('assets')}</span>
                    </button>
                    <button onClick={() => setActiveTab('debts')} className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${activeTab === 'debts' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-indigo-600 dark:shadow-indigo-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}>
                        <CreditCard size={20} />
                        <span className="font-medium hidden lg:block">{t('debts')}</span>
                    </button>
                </nav>


            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-20 lg:ml-64 p-8 transition-all duration-300 relative">
                {/* Header with Save Status - Overlay */}
                <div className="absolute top-4 right-8 z-10 pointer-events-none">
                    <div className={`flex items-center gap-2 text-sm font-medium transition-opacity duration-500 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 ${saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                        {saveStatus === 'saving' && <span className="text-slate-400 flex items-center gap-1"><Save size={14} className="animate-pulse" /> {t('saving')}</span>}
                        {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle size={14} /> {t('saved')}</span>}
                        {saveStatus === 'error' && <span className="text-rose-500 flex items-center gap-1"><AlertCircle size={14} /> {t('save_failed')}</span>}
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <header className="flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('financial_overview')}</h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">{t('financial_overview_desc')}</p>
                            </div>
                        </header>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-slate-900 dark:bg-indigo-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                <p className="text-slate-400 dark:text-indigo-200 text-sm font-medium mb-2">{t('net_worth')}</p>
                                <h3 className="text-3xl font-bold">{Math.round(projection.stats.netWorth).toLocaleString()}€</h3>
                                <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
                                    <TrendingUp size={100} />
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">{t('total_assets')}</p>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(projection.stats.totalAssets).toLocaleString()}€</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">{t('total_debt')}</p>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(projection.stats.totalDebt).toLocaleString()}€</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">{t('savings_rate')}</p>
                                <h3 className={`text-2xl font-bold ${projection.stats.monthlySurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {Math.round(projection.stats.monthlySurplus > 0 && projection.stats.netWorth !== 0 ? (projection.stats.monthlySurplus / ((data.budget?.incomeCategories || []).reduce((sum, c) => sum + (Number(data.budget?.values?.[c.id]) || 0), 0) || 1)) * 100 : 0)}%
                                </h3>
                            </div>
                        </div>

                        {/* Final Projection Breakdown Section */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('future_portfolio_composition')}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {/* Future Net Worth Card - NEW */}
                                <div className="bg-slate-900 dark:bg-indigo-600 text-white p-4 rounded-2xl shadow-lg flex flex-col justify-between transform scale-[1.02] ring-2 ring-emerald-500/50">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-indigo-200 uppercase mb-1">{t('future_net_worth')}</p>
                                        <p className="text-lg font-bold">{Math.round(projection.stats.finalBuckets?.NetWorth || 0).toLocaleString()}€</p>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 text-xs">
                                        <span className="font-bold text-emerald-400">
                                            +{Math.round((projection.stats.finalBuckets?.NetWorth || 0) - (projection.stats.netWorth || 0)).toLocaleString()}€
                                        </span>
                                        <span className="text-slate-400 dark:text-indigo-300">{t('in_months', { count: projectionMonths })}</span>
                                    </div>
                                </div>

                                {['stock', 'crypto', 'metal', 'cash'].map(type => {
                                    const finalVal = projection.stats.finalBuckets?.[type] || 0;
                                    const initialVal = (data.assets || []).filter(a => a.type === type).reduce((sum, a) => sum + (Number(a.value) || 0), 0);
                                    const growth = finalVal - initialVal;

                                    return (
                                        <div key={type} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t(`asset_${type}`)}</p>
                                                <p className="text-lg font-bold text-slate-900 dark:text-white">{finalVal.toLocaleString()}€</p>
                                            </div>
                                            <div className="flex items-center gap-1 mt-2 text-xs">
                                                <span className={cn("font-bold", growth >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                    {growth >= 0 ? '+' : ''}{growth.toLocaleString()}€
                                                </span>
                                                <span className="text-slate-400">{t('in_months', { count: projectionMonths })}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Projection Chart */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative z-0">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-30">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('wealth_projection')}</h3>

                                <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 items-center gap-4 shadow-sm">
                                    <div className="relative" ref={yieldPopupRef}>
                                        <button
                                            onClick={() => setShowYields(!showYields)}
                                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                                        >
                                            <TrendingUp size={14} className="text-emerald-500" />
                                            {t('config_yields')}
                                        </button>

                                        {showYields && (
                                            <div className="absolute top-12 right-0 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-64 z-50 animate-in zoom-in-95 duration-200">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="font-bold text-sm">{t('annual_yield')} (%)</h4>
                                                    <button onClick={() => setShowYields(false)}><X size={14} /></button>
                                                </div>
                                                <div className="space-y-3">
                                                    {['stock', 'crypto', 'real_estate', 'metal', 'cash'].map(type => (
                                                        <div key={type}>
                                                            <div className="flex justify-between text-xs mb-1 text-slate-500 dark:text-slate-400">
                                                                <span className="capitalize">{t(`asset_${type}`)}</span>
                                                                <span className="font-bold">{data.assetYields?.[type] || 0}%</span>
                                                            </div>
                                                            <input
                                                                type="range" min="0" max="20" step="0.5"
                                                                value={data.assetYields?.[type] || 0}
                                                                onChange={(e) => setData(prev => ({
                                                                    ...prev,
                                                                    assetYields: {
                                                                        ...prev.assetYields,
                                                                        [type]: Number(e.target.value)
                                                                    }
                                                                }))}
                                                                className={cn("w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700",
                                                                    type === 'stock' ? 'accent-blue-500' :
                                                                        type === 'crypto' ? 'accent-violet-500' :
                                                                            type === 'cash' ? 'accent-emerald-500' :
                                                                                'accent-slate-500'
                                                                )}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

                                    <div className="flex items-center gap-3 pr-2">
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-1 border border-slate-100 dark:border-slate-800">
                                            <input
                                                type="number" min="0" max="50"
                                                value={duration.years}
                                                onChange={(e) => setDuration(prev => ({ ...prev, years: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                className="w-8 bg-transparent text-center text-sm font-bold outline-none text-slate-900 dark:text-white"
                                            />
                                            <span className="text-[10px] uppercase font-bold text-slate-400">{t('years')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-1 border border-slate-100 dark:border-slate-800">
                                            <input
                                                type="number" min="0" max="11"
                                                value={duration.months}
                                                onChange={(e) => setDuration(prev => ({ ...prev, months: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                className="w-8 bg-transparent text-center text-sm font-bold outline-none text-slate-900 dark:text-white"
                                            />
                                            <span className="text-[10px] uppercase font-bold text-slate-400">{t('months')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={projection.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset={off} stopColor={off <= 0 ? "#f43f5e" : "#10b981"} stopOpacity={1} />
                                                <stop offset={off} stopColor={off >= 1 ? "#10b981" : "#f43f5e"} stopOpacity={1} />
                                            </linearGradient>
                                            <linearGradient id="splitColorFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset={off} stopColor={off <= 0 ? "#f43f5e" : "#10b981"} stopOpacity={0.3} />
                                                <stop offset={off} stopColor={off >= 1 ? "#10b981" : "#f43f5e"} stopOpacity={0.3} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }}
                                            dy={10}
                                            minTickGap={50}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }}
                                            tickFormatter={(value) => `${value / 1000}k`}
                                        />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700">
                                                            <p className="font-bold text-slate-900 dark:text-white mb-2">{label}</p>
                                                            <div className="space-y-1 text-xs">
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-slate-500">{t('net_worth')}</span>
                                                                    <span className={cn("font-bold", data.NetWorth >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                                        {data.NetWorth.toLocaleString()}€
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-slate-500">{t('total_assets')}</span>
                                                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                                                        {data.Assets.toLocaleString()}€
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-slate-500">{t('latent_gain')}</span>
                                                                    <span className="font-bold text-emerald-500">
                                                                        +{data.UnrealizedGain?.toLocaleString()}€
                                                                    </span>
                                                                </div>
                                                                <div className="h-px bg-slate-100 dark:bg-slate-700 my-2" />
                                                                {['stock', 'crypto', 'real_estate', 'metal', 'cash'].map(k => (
                                                                    <div key={k} className="flex justify-between gap-4">
                                                                        <span className="text-slate-400 capitalize">{t(`asset_${k}`)}</span>
                                                                        <span className="font-mono text-slate-600 dark:text-slate-400">
                                                                            {(data[k] || 0).toLocaleString()}€
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                                        <Area
                                            type="monotone"
                                            dataKey="NetWorth"
                                            stroke="url(#splitColor)"
                                            strokeWidth={3}
                                            fill="url(#splitColorFill)"
                                            animationDuration={300}
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

                {activeTab === 'invest' && (
                    <InvestmentPlan
                        assets={data.assets}
                        investmentGoal={data.investmentGoal || 0}
                        targets={data.investmentTargets || { stock: 50, crypto: 30, metal: 10, cash: 10 }}
                        strategy={data.investmentStrategy || 'smart'}
                        onUpdateGoal={(val) => setData(prev => ({ ...prev, investmentGoal: val }))}
                        onUpdateTargets={(val) => setData(prev => ({ ...prev, investmentTargets: val }))}
                        onUpdateStrategy={(val) => setData(prev => ({ ...prev, investmentStrategy: val }))}
                    />
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
                            investmentGoal={data.investmentGoal || 0}
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


            {/* Floating Settings Button - Portalled to body to avoid transform stacking context issues */}
            {createPortal(
                <button
                    onClick={() => setShowSettings(true)}
                    className="fixed bottom-6 left-6 z-50 p-4 bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-indigo-600 dark:shadow-indigo-900/20 rounded-full hover:scale-110 transition-all duration-300"
                    title={t('settings')}
                >
                    <Settings size={24} />
                </button>,
                document.body
            )}

            {/* Settings Modal */}
            {showSettings && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('settings')}</h3>
                            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 dark:text-white">{t('theme')}</span>
                                    <ThemeToggle />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 dark:text-white">{t('language')}</span>
                                    <LanguageSwitcher />
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-2">{t('data_management')}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-300 mb-4">{t('data_management_desc')}</p>

                                <div className="flex gap-3">
                                    <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-700 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-500 transition-colors">
                                        <Download size={18} /> {t('export')}
                                    </button>
                                    <label className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors cursor-pointer">
                                        <Upload size={18} /> {t('import')}
                                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-xs text-slate-400">Klaro v0.1.0 • Local Storage Only</p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Dashboard;
