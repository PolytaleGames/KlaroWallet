import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Target, PieChart, ShieldCheck, RefreshCw, ArrowRight, Coins, Wallet, Landmark, Home, Briefcase, Lock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const ASSET_CATEGORIES = [
    { id: 'stock', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'crypto', icon: Coins, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { id: 'metal', icon: Landmark, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'cash', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

const InvestmentPlan = ({ assets = [], investmentGoal, onUpdateGoal, targets, onUpdateTargets, strategy, onUpdateStrategy }) => {
    const { t } = useTranslation();
    const [localTargets, setLocalTargets] = useState(targets);

    // Sync external targets if they change (and we aren't dragging ideally, but simple sync is fine for now)
    useEffect(() => {
        setLocalTargets(targets);
    }, [targets]);

    const handleTargetChange = (id, value) => {
        const newTargets = { ...localTargets, [id]: Number(value) };
        setLocalTargets(newTargets);
        // Debounce update to parent could be added here, but direct update is okay for now if not laggy
        onUpdateTargets(newTargets);
    };

    const totalTarget = Object.values(localTargets).reduce((a, b) => a + b, 0);

    // --- Calculation Engine ---

    const { liquidAssets, currentAllocation, plan } = useMemo(() => {
        // 1. Filter Liquid Assets
        const liquid = assets.filter(a => ['stock', 'crypto', 'metal', 'cash'].includes(a.type));

        // 2. Calculate Current Values
        const currentVals = { stock: 0, crypto: 0, metal: 0, cash: 0 };
        let totalLiquidValue = 0;

        liquid.forEach(a => {
            const val = Number(a.totalValue) || (Number(a.quantity) * Number(a.unitPrice)) || 0;
            if (currentVals[a.type] !== undefined) {
                currentVals[a.type] += val;
                totalLiquidValue += val;
            }
        });

        // 3. Current Allocation %
        const currentAlloc = {};
        Object.keys(currentVals).forEach(key => {
            currentAlloc[key] = totalLiquidValue > 0 ? (currentVals[key] / totalLiquidValue) * 100 : 0;
        });

        // 4. Generate Plan based on Strategy
        const recommendations = [];
        const projectedTotal = totalLiquidValue + investmentGoal;

        if (strategy === 'dca') {
            // Simple Split
            ASSET_CATEGORIES.forEach(cat => {
                const targetPct = localTargets[cat.id] || 0;
                recommendations.push({
                    id: cat.id,
                    amount: investmentGoal * (targetPct / 100),
                    reason: t('fixed_split')
                });
            });
        } else {
            // Smart Rebalancing (No-Sell DVA)
            // Goal: Steer towards Target Value = projectedTotal * target%

            const gaps = {};
            let totalPositiveGap = 0;

            ASSET_CATEGORIES.forEach(cat => {
                const targetVal = projectedTotal * ((localTargets[cat.id] || 0) / 100);
                const gap = targetVal - currentVals[cat.id];
                gaps[cat.id] = gap;
                if (gap > 0) totalPositiveGap += gap;
            });

            // Distribute Budget proportionally to Positive Gaps
            ASSET_CATEGORIES.forEach(cat => {
                const gap = gaps[cat.id];
                let amount = 0;

                if (gap > 0) {
                    // If total positive gap is small (we are close to target), we might have extra budget? 
                    // No, if gap > 0, we want to fill it. 
                    // Alloc = Budget * (Gap / TotalPositiveGap)
                    amount = totalPositiveGap > 0 ? investmentGoal * (gap / totalPositiveGap) : 0;
                }

                recommendations.push({
                    id: cat.id,
                    amount: amount,
                    reason: gap > 0 ? t('underweight') : t('overweight')
                });
            });
        }

        return {
            liquidAssets: liquid,
            currentValues: currentVals,
            totalLiquidValue,
            currentAllocation: currentAlloc,
            plan: recommendations
        };

    }, [assets, localTargets, strategy, investmentGoal]);


    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in pb-20">

            {/* Header / Goal Setting */}
            <div className="bg-slate-900 dark:bg-indigo-600 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                <Target size={24} className="text-emerald-300" />
                            </div>
                            <h2 className="text-3xl font-bold">{t('investment_plan')}</h2>
                        </div>
                        <p className="text-slate-300 dark:text-indigo-100 max-w-md text-lg leading-relaxed mb-6">
                            {t('investment_plan_desc')}
                        </p>

                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 max-w-sm">
                            <label className="block text-sm font-medium text-slate-300 dark:text-indigo-200 mb-2">
                                {t('monthly_investment_budget')}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={investmentGoal === 0 ? '' : investmentGoal}
                                    onChange={(e) => onUpdateGoal(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full bg-slate-900/50 dark:bg-indigo-900/50 border border-slate-700 dark:border-indigo-500/50 rounded-xl px-4 py-3 text-2xl font-bold text-white placeholder-slate-600 dark:placeholder-indigo-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">€</span>
                            </div>
                        </div>

                    </div>

                    {/* Target Allocator (Pie & Sliders) */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl flex items-center gap-2">
                                <PieChart size={20} className="text-emerald-300" />
                                {t('target_allocation')}
                            </h3>
                            <span className={cn("text-sm font-bold px-3 py-1 rounded-full border",
                                totalTarget === 100 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            )}>
                                Total: {totalTarget}%
                            </span>
                        </div>

                        <div className="space-y-4">
                            {ASSET_CATEGORIES.map(cat => (
                                <div key={cat.id}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="flex items-center gap-2 text-slate-300">
                                            <cat.icon size={14} className={cat.color.replace('text-', 'text-')} />
                                            {t(`asset_${cat.id}`)}
                                        </span>
                                        <span className="font-mono font-bold">{localTargets[cat.id] || 0}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="100" step="5"
                                        value={localTargets[cat.id] || 0}
                                        onChange={(e) => handleTargetChange(cat.id, e.target.value)}
                                        className={cn("w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700",
                                            `accent-${cat.color.split('-')[1]}-500`
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                        {totalTarget !== 100 && (
                            <p className="text-xs text-rose-300 mt-4 flex items-center gap-2 bg-rose-500/10 p-2 rounded-lg">
                                <AlertCircle size={14} /> {t('total_must_be_100')}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Strategy Selector */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white px-2">{t('strategy')}</h3>

                    <button
                        onClick={() => onUpdateStrategy('smart')}
                        className={cn("w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden group",
                            strategy === 'smart'
                                ? "bg-slate-900 dark:bg-indigo-600 text-white border-transparent shadow-lg ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <RefreshCw size={20} />
                            </div>
                            {strategy === 'smart' && <div className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] uppercase font-bold rounded">{t('active')}</div>}
                        </div>
                        <h4 className="font-bold text-lg mb-1">{t('smart_rebalancing')}</h4>
                        <p className={cn("text-xs leading-relaxed", strategy === 'smart' ? "text-slate-300 dark:text-indigo-100" : "text-slate-400 dark:text-slate-500")}>
                            {t('smart_dva_desc') || "Prioritizes underperforming assets to return to target allocation without selling."}
                        </p>
                    </button>

                    <button
                        onClick={() => onUpdateStrategy('dca')}
                        className={cn("w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden group",
                            strategy === 'dca'
                                ? "bg-slate-900 dark:bg-indigo-600 text-white border-transparent shadow-lg ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                <TrendingUp size={20} />
                            </div>
                            {strategy === 'dca' && <div className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] uppercase font-bold rounded">{t('active')}</div>}
                        </div>
                        <h4 className="font-bold text-lg mb-1">{t('fixed_dca')}</h4>
                        <p className={cn("text-xs leading-relaxed", strategy === 'dca' ? "text-slate-300 dark:text-indigo-100" : "text-slate-400 dark:text-slate-500")}>
                            {t('dca_desc') || "Splits budget according to target % regardless of current portfolio balance."}
                        </p>
                    </button>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <h5 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-2 flex items-center gap-2"><Briefcase size={14} /> {t('excluded_assets')}</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('excluded_assets_desc')}
                        </p>
                    </div>
                </div>

                {/* Right: The Action Plan */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-xl text-slate-900 dark:text-white">{t('monthly_action_plan')}</h3>
                                <p className="text-slate-400 text-sm mt-0.5">{t('based_on_strategy')}: <span className="text-emerald-600 font-bold uppercase">{strategy === 'smart' ? t('smart_rebalancing') : t('fixed_dca')}</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 uppercase font-bold">{t('total_investment')}</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(investmentGoal).toLocaleString()}€</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider pl-6">{t('asset_class')}</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{t('current_alloc')}</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{t('target')}</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-6">{t('recommended_buy')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plan.map(item => {
                                        const cat = ASSET_CATEGORIES.find(c => c.id === item.id);
                                        const isBuying = item.amount > 0;

                                        return (
                                            <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                <td className="p-4 pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("p-2 rounded-lg", cat.bg, cat.color)}>
                                                            <cat.icon size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white">{t(`asset_${item.id}`)}</p>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{item.reason}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                                        {currentAllocation[item.id].toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {localTargets[item.id]}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right pr-6">
                                                    <div className={cn("inline-flex flex-col items-end",
                                                        isBuying ? "opacity-100" : "opacity-30 grayscale"
                                                    )}>
                                                        <span className={cn("text-lg font-bold flex items-center gap-1",
                                                            isBuying ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                                                        )}>
                                                            +{Math.round(item.amount).toLocaleString()}€
                                                        </span>
                                                        {isBuying && (
                                                            <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                                                                {t('buy')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex items-start gap-3">
                                <ShieldCheck size={20} className="text-emerald-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    <strong>{t('warren_advice_label')}:</strong> {strategy === 'smart'
                                        ? t('warren_advice_smart')
                                        : t('warren_advice_dca')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default InvestmentPlan;
