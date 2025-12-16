import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Plus, Trash2, Edit2, TrendingDown, Calendar, Percent, Euro, Shield, ChevronDown, ChevronUp, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateMonthsRemaining, calculatePrincipal, generateAmortizationSchedule } from '../utils/financeUtils';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// --- Components ---

const AmortizationTable = ({ schedule }) => {
    const { t } = useTranslation();
    if (!schedule || schedule.length === 0) return null;

    return (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-medium sticky top-0">
                        <tr>
                            <th className="p-3">{t('month')}</th>
                            <th className="p-3">{t('payment')}</th>
                            <th className="p-3">{t('interest')}</th>
                            <th className="p-3">{t('principal')}</th>
                            <th className="p-3">{t('balance')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {schedule.map((row) => {
                            const date = new Date();
                            date.setMonth(date.getMonth() + row.month - 1);
                            const dateStr = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

                            return (
                                <tr key={row.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                                    <td className="p-3 text-slate-500 dark:text-slate-400 first-letter:uppercase">{dateStr}</td>
                                    <td className="p-3 font-medium dark:text-white">{row.payment.toFixed(2)}€</td>
                                    <td className="p-3 text-rose-500 dark:text-rose-400">{row.interest.toFixed(2)}€</td>
                                    <td className="p-3 text-emerald-600 dark:text-emerald-400">{row.principal.toFixed(2)}€</td>
                                    <td className="p-3 text-slate-700 dark:text-slate-300">{Math.max(0, row.balance).toFixed(2)}€</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DebtCard = ({ debt, onEdit, onRemove }) => {
    const { t } = useTranslation();
    const [showSchedule, setShowSchedule] = useState(false);

    const monthsRemaining = calculateMonthsRemaining(debt.endDate);
    const principal = calculatePrincipal(Number(debt.monthlyPayment), Number(debt.rate), monthsRemaining);
    const totalCost = (Number(debt.monthlyPayment) + Number(debt.insurance || 0)) * monthsRemaining;
    const totalInterest = (Number(debt.monthlyPayment) * monthsRemaining) - principal;

    const schedule = useMemo(() =>
        generateAmortizationSchedule(principal, Number(debt.rate), monthsRemaining, Number(debt.monthlyPayment)),
        [principal, debt.rate, monthsRemaining, debt.monthlyPayment]
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{debt.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {t('ends')} {(() => {
                                try {
                                    return new Date(debt.endDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                                } catch (e) {
                                    return t('invalid_date');
                                }
                            })()}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onEdit(debt)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-white rounded-lg transition-colors"><Edit2 size={18} /></button>
                        <button onClick={() => onRemove(debt.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('remaining_principal')}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{Math.round(principal).toLocaleString()}€</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('monthly_payment')}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{Number(debt.monthlyPayment).toLocaleString()}€</p>
                        {Number(debt.insurance) > 0 && <p className="text-xs text-slate-400 dark:text-slate-500">+ {debt.insurance}€ {t('insurance_abbr')}</p>}
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('interest_rate')}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{debt.rate}%</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('time_left')}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{monthsRemaining} mo</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowSchedule(!showSchedule)}
                    className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    {showSchedule ? t('hide_amortization') : t('show_amortization')}
                    {showSchedule ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showSchedule && <AmortizationTable schedule={schedule} />}
            </div>
        </div>
    );
};

const DebtForm = ({ initialData, onSubmit, onCancel }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState(initialData || {
        name: '',
        rate: '',
        endDate: '',
        monthlyPayment: '',
        insurance: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-6 m-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{initialData ? t('edit_loan') : t('add_new_loan')}</h3>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('loan_name')}</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Mortgage, Car Loan"
                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('interest_rate_percent')}</label>
                            <div className="relative">
                                <Percent size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    name="rate"
                                    type="number"
                                    step="0.01"
                                    value={formData.rate}
                                    onChange={handleChange}
                                    placeholder="3.5"
                                    className="w-full pl-10 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('end_date')}</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    name="endDate"
                                    type="month"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    className="w-full pl-10 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('monthly_payment')}</label>
                            <div className="relative">
                                <Euro size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    name="monthlyPayment"
                                    type="number"
                                    value={formData.monthlyPayment}
                                    onChange={handleChange}
                                    placeholder="1000"
                                    className="w-full pl-10 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    required
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{t('principal_plus_interest')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('insurance_optional')}</label>
                            <div className="relative">
                                <Shield size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    name="insurance"
                                    type="number"
                                    value={formData.insurance}
                                    onChange={handleChange}
                                    placeholder="50"
                                    className="w-full pl-10 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{t('monthly_cost')}</p>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="submit" className="flex-1 bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors">
                            {initialData ? t('save_changes') : t('add_loan')}
                        </button>
                        <button type="button" onClick={onCancel} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            {t('cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

const DebtManager = ({ debts, onAddDebt, onRemoveDebt, onUpdateDebt }) => {
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [editingDebt, setEditingDebt] = useState(null);

    const handleSave = (data) => {
        if (editingDebt) {
            onUpdateDebt(editingDebt.id, data);
            setEditingDebt(null);
        } else {
            onAddDebt({ ...data, id: Date.now().toString() });
            setIsAdding(false);
        }
    };

    const totalMonthlyPayment = debts.reduce((sum, d) => sum + Number(d.monthlyPayment) + Number(d.insurance || 0), 0);
    const totalPrincipal = debts.reduce((sum, d) => {
        const months = calculateMonthsRemaining(d.endDate);
        return sum + calculatePrincipal(Number(d.monthlyPayment), Number(d.rate), months);
    }, 0);

    const totalInterest = debts.reduce((sum, d) => {
        const months = calculateMonthsRemaining(d.endDate);
        const principal = calculatePrincipal(Number(d.monthlyPayment), Number(d.rate), months);
        return sum + ((Number(d.monthlyPayment) * months) - principal);
    }, 0);

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in">

            {/* Summary Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 dark:bg-indigo-600 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-slate-400 dark:text-indigo-200 font-medium mb-2">{t('total_remaining_debt')}</p>
                        <h2 className="text-5xl font-bold mb-4">{Math.round(totalPrincipal).toLocaleString()}€</h2>
                        <div className="flex items-center gap-2 text-slate-300 dark:text-indigo-100">
                            <TrendingDown size={20} />
                            <span>{t('estimated_principal')}</span>
                        </div>
                        {totalInterest > 0 && (
                            <p className="text-sm text-slate-400 dark:text-indigo-300 mt-2">
                                + {Math.round(totalInterest).toLocaleString()}€ {t('interest').toLowerCase()}
                            </p>
                        )}
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
                        <Euro size={200} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">{t('total_monthly_payments')}</p>
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{totalMonthlyPayment.toLocaleString()}€</h2>
                    <p className="text-slate-400 text-sm">{t('includes_insurance_costs')}</p>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t('your_loans')}</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-slate-900/20 dark:shadow-indigo-900/20"
                >
                    <Plus size={20} /> {t('add_loan')}
                </button>
            </div>

            {/* Debt List */}
            <div className="space-y-4">
                {debts.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-700 rounded-3xl border border-dashed border-slate-200 dark:border-slate-600">
                        <p className="text-slate-400 font-medium">{t('no_loans_added')}</p>
                        <button onClick={() => setIsAdding(true)} className="mt-4 text-emerald-600 dark:text-emerald-400 font-bold hover:underline">{t('add_first_loan')}</button>
                    </div>
                ) : (
                    debts.map(debt => (
                        <DebtCard
                            key={debt.id}
                            debt={debt}
                            onEdit={setEditingDebt}
                            onRemove={onRemoveDebt}
                        />
                    ))
                )}
            </div>

            {/* Modals */}
            {(isAdding || editingDebt) && (
                <DebtForm
                    initialData={editingDebt}
                    onSubmit={handleSave}
                    onCancel={() => { setIsAdding(false); setEditingDebt(null); }}
                />
            )}

        </div>
    );
};

export default DebtManager;
