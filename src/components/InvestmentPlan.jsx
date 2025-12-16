import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Target, BookOpen, ChevronRight, ShieldCheck, PieChart } from 'lucide-react';

const InvestmentPlan = ({ investmentGoal, onUpdateGoal }) => {
    const { t } = useTranslation();
    const [goal, setGoal] = useState(investmentGoal || 0);

    const handleBlur = () => {
        onUpdateGoal(Number(goal));
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in">

            {/* Header / Goal Setting */}
            <div className="bg-slate-900 dark:bg-indigo-600 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                <Target size={24} className="text-emerald-300" />
                            </div>
                            <h2 className="text-3xl font-bold">{t('investment_plan')}</h2>
                        </div>
                        <p className="text-slate-300 dark:text-indigo-100 max-w-md text-lg leading-relaxed">
                            {t('investment_plan_desc')}
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                        <label className="block text-sm font-medium text-slate-300 dark:text-indigo-200 mb-2">
                            {t('monthly_investment_budget')}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={goal === 0 ? '' : goal}
                                onChange={(e) => setGoal(e.target.value)}
                                onBlur={handleBlur}
                                placeholder="0"
                                className="w-full bg-slate-900/50 dark:bg-indigo-900/50 border border-slate-700 dark:border-indigo-500/50 rounded-xl px-4 py-4 text-3xl font-bold text-white placeholder-slate-600 dark:placeholder-indigo-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 text-xl font-medium">€</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-indigo-300 mt-3 flex items-center gap-2">
                            <ShieldCheck size={14} /> {t('value_excluded_from_expenses')}
                        </p>
                    </div>
                </div>

                {/* Decoration */}
                <div className="absolute -right-10 -bottom-10 opacity-10 transform -rotate-12">
                    <TrendingUp size={250} />
                </div>
            </div>

            {/* Guide Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Step 1 */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <BookOpen size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('learn_basics')}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                        {t('learn_basics_desc')}
                    </p>
                    <button className="text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                        {t('read_guide')} <ChevronRight size={14} />
                    </button>
                </div>

                {/* Step 2 */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <PieChart size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('diversification')}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                        {t('diversification_desc')}
                    </p>
                    <button className="text-violet-600 dark:text-violet-400 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                        {t('explore_strategies')} <ChevronRight size={14} />
                    </button>
                </div>

                {/* Step 3 */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('start_investing')}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                        {t('start_investing_desc')}
                    </p>
                    <button className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                        {t('view_platforms')} <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Placeholder for future content */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
                <p className="text-slate-400 dark:text-slate-500 font-medium">{t('more_content_coming_soon')}</p>
            </div>

        </div>
    );
};

export default InvestmentPlan;
