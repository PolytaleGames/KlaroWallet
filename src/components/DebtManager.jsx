import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, TrendingDown, Calendar, Percent, DollarSign, Shield, ChevronDown, ChevronUp, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateMonthsRemaining, calculatePrincipal, generateAmortizationSchedule } from '../utils/financeUtils';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// --- Components ---

const AmortizationTable = ({ schedule }) => {
    if (!schedule || schedule.length === 0) return null;

    return (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                        <tr>
                            <th className="p-3">Month</th>
                            <th className="p-3">Payment</th>
                            <th className="p-3">Interest</th>
                            <th className="p-3">Principal</th>
                            <th className="p-3">Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {schedule.map((row) => (
                            <tr key={row.month} className="hover:bg-slate-50/50">
                                <td className="p-3 text-slate-500">{row.month}</td>
                                <td className="p-3 font-medium">{row.payment.toFixed(2)}€</td>
                                <td className="p-3 text-rose-500">{row.interest.toFixed(2)}€</td>
                                <td className="p-3 text-emerald-600">{row.principal.toFixed(2)}€</td>
                                <td className="p-3 text-slate-700">{Math.max(0, row.balance).toFixed(2)}€</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DebtCard = ({ debt, onEdit, onRemove }) => {
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{debt.name}</h3>
                        <p className="text-slate-500 text-sm">
                            Ends {(() => {
                                try {
                                    return new Date(debt.endDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                                } catch (e) {
                                    return 'Invalid Date';
                                }
                            })()}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onEdit(debt)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 size={18} /></button>
                        <button onClick={() => onRemove(debt.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Remaining Principal</p>
                        <p className="text-lg font-bold text-slate-900">{Math.round(principal).toLocaleString()}€</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Monthly Payment</p>
                        <p className="text-lg font-bold text-slate-900">{Number(debt.monthlyPayment).toLocaleString()}€</p>
                        {Number(debt.insurance) > 0 && <p className="text-xs text-slate-400">+ {debt.insurance}€ ins.</p>}
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Interest Rate</p>
                        <p className="text-lg font-bold text-slate-900">{debt.rate}%</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Time Left</p>
                        <p className="text-lg font-bold text-slate-900">{monthsRemaining} mo</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowSchedule(!showSchedule)}
                    className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                >
                    {showSchedule ? 'Hide Amortization' : 'Show Amortization'}
                    {showSchedule ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showSchedule && <AmortizationTable schedule={schedule} />}
            </div>
        </div>
    );
};

const DebtForm = ({ initialData, onSubmit, onCancel }) => {
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 m-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">{initialData ? 'Edit Loan' : 'Add New Loan'}</h3>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Loan Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Mortgage, Car Loan"
                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Interest Rate (%)</label>
                            <div className="relative">
                                <Percent size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    name="rate"
                                    type="number"
                                    step="0.01"
                                    value={formData.rate}
                                    onChange={handleChange}
                                    placeholder="3.5"
                                    className="w-full pl-10 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    name="endDate"
                                    type="month"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    className="w-full pl-10 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Payment</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    name="monthlyPayment"
                                    type="number"
                                    value={formData.monthlyPayment}
                                    onChange={handleChange}
                                    placeholder="1000"
                                    className="w-full pl-10 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                    required
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Principal + Interest</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Insurance (Optional)</label>
                            <div className="relative">
                                <Shield size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    name="insurance"
                                    type="number"
                                    value={formData.insurance}
                                    onChange={handleChange}
                                    placeholder="50"
                                    className="w-full pl-10 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Monthly cost</p>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="submit" className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                            {initialData ? 'Save Changes' : 'Add Loan'}
                        </button>
                        <button type="button" onClick={onCancel} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DebtManager = ({ debts, onAddDebt, onRemoveDebt, onUpdateDebt }) => {
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

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in">

            {/* Summary Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-slate-400 font-medium mb-2">Total Remaining Debt</p>
                        <h2 className="text-5xl font-bold mb-4">{Math.round(totalPrincipal).toLocaleString()}€</h2>
                        <div className="flex items-center gap-2 text-slate-300">
                            <TrendingDown size={20} />
                            <span>Estimated Principal</span>
                        </div>
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
                        <DollarSign size={200} />
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-slate-500 font-medium mb-2">Total Monthly Payments</p>
                    <h2 className="text-4xl font-bold text-slate-900 mb-2">{totalMonthlyPayment.toLocaleString()}€</h2>
                    <p className="text-slate-400 text-sm">Includes insurance costs</p>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-900">Your Loans</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-lg shadow-slate-900/20"
                >
                    <Plus size={20} /> Add Loan
                </button>
            </div>

            {/* Debt List */}
            <div className="space-y-4">
                {debts.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">No loans added yet.</p>
                        <button onClick={() => setIsAdding(true)} className="mt-4 text-emerald-600 font-bold hover:underline">Add your first loan</button>
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
