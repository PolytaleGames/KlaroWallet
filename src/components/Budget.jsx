import React, { useState, useRef } from 'react';
import { Plus, TrendingUp, TrendingDown, PiggyBank, MoreHorizontal, GripVertical, Trash2, Lock, CreditCard, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import IconPicker, { ICON_MAP } from './IconPicker';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const DraggableCategoryRow = ({
    cat,
    value,
    onValueChange,
    onUpdate,
    onRemove,
    index,
    moveRow,
    type,
    totalIncome
}) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(cat.name);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const ref = useRef(null);

    const handleDragStart = (e) => {
        e.dataTransfer.setData('index', index);
        e.dataTransfer.setData('type', type);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const dragIndex = Number(e.dataTransfer.getData('index'));
        const dragType = e.dataTransfer.getData('type');

        if (dragType === type && dragIndex !== index) {
            moveRow(dragIndex, index);
        }
    };

    const saveName = () => {
        if (editName.trim() && editName !== cat.name) {
            onUpdate(cat.id, { name: editName });
        }
        setIsEditingName(false);
    };

    const handleDelete = () => {
        if (confirm(`Delete category "${cat.name}"?`)) {
            onRemove(cat.id);
        }
    };

    const getIcon = (iconName) => {
        const Icon = ICON_MAP[iconName] || MoreHorizontal;
        return <Icon size={20} />;
    };

    const percentOfIncome = totalIncome > 0 ? (value / totalIncome) * 100 : 0;

    return (
        <div
            ref={ref}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors group relative cursor-move"
        >
            {showIconPicker && (
                <IconPicker
                    selectedIcon={cat.icon}
                    onSelect={(icon) => { onUpdate(cat.id, { icon }); setShowIconPicker(false); }}
                    onClose={() => setShowIconPicker(false)}
                />
            )}

            {/* Background Progress Bar for Expenses */}
            {type === 'expense' && (
                <div
                    className="absolute left-0 top-0 bottom-0 bg-rose-50/50 transition-all duration-500 pointer-events-none"
                    style={{ width: `${Math.min(100, percentOfIncome)}%` }}
                />
            )}

            {/* Drag Handle */}
            <div className="text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
            </div>

            {/* Icon (Click to Edit) */}
            <button
                onClick={() => setShowIconPicker(true)}
                className={cn(
                    "relative z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-105",
                    type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}
            >
                {getIcon(cat.icon)}
            </button>

            {/* Name (Click to Edit) */}
            <div className="relative z-10 flex-1">
                {isEditingName ? (
                    <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={saveName}
                        onKeyDown={e => e.key === 'Enter' && saveName()}
                        autoFocus
                        className="font-medium text-slate-900 bg-white border border-slate-300 rounded px-1 w-full focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                ) : (
                    <p
                        onClick={() => setIsEditingName(true)}
                        className="font-medium text-slate-900 cursor-text hover:underline decoration-slate-300 underline-offset-4"
                    >
                        {cat.name}
                    </p>
                )}

                {type === 'expense' ? (
                    <p className="text-xs text-slate-400">{Math.round(percentOfIncome)}% of income</p>
                ) : (
                    <p className="text-xs text-slate-400">Monthly</p>
                )}
            </div>

            {/* Value Input */}
            <div className="relative z-10 flex items-center gap-1">
                <input
                    type="number"
                    value={value === 0 ? '' : value}
                    placeholder="0"
                    onChange={(e) => onValueChange(cat.id, e.target.value)}
                    className={cn(
                        "w-24 text-right font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:outline-none transition-all placeholder:text-slate-300",
                        type === 'income' ? "focus:border-emerald-500" : "focus:border-rose-500"
                    )}
                />
                <span className="text-slate-400 font-medium">€</span>
            </div>

            {/* Delete Button */}
            <button
                onClick={handleDelete}
                className="relative z-10 p-2 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete Category"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
};

const StaticDebtRow = ({ debt, totalIncome }) => {
    const totalMonthlyCost = Number(debt.monthlyPayment) + Number(debt.insurance || 0);
    const percentOfIncome = totalIncome > 0 ? (totalMonthlyCost / totalIncome) * 100 : 0;

    return (
        <div className="p-4 flex items-center gap-4 bg-slate-50/50 hover:bg-slate-50 transition-colors relative group">
            {/* Background Progress Bar */}
            <div
                className="absolute left-0 top-0 bottom-0 bg-rose-50/30 transition-all duration-500 pointer-events-none"
                style={{ width: `${Math.min(100, percentOfIncome)}%` }}
            />

            <div className="text-slate-300 w-4 flex justify-center">
                <Lock size={14} />
            </div>

            <div className="relative z-10 w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <CreditCard size={20} />
            </div>

            <div className="relative z-10 flex-1">
                <p className="font-medium text-slate-700">{debt.name}</p>
                <p className="text-xs text-slate-400">
                    Loan Payment {Number(debt.insurance) > 0 && `+ ${debt.insurance}€ Ins.`} • {Math.round(percentOfIncome)}% of income
                </p>
            </div>

            <div className="relative z-10 flex items-center gap-1">
                <span className="w-24 text-right font-bold text-slate-500">
                    {totalMonthlyCost}
                </span>
                <span className="text-slate-400 font-medium">€</span>
            </div>

            <div className="w-8" /> {/* Spacer for alignment with delete button */}
        </div>
    );
};

const Budget = ({ values, debts = [], incomeCategories, expenseCategories, onValueChange, onAddCategory, onUpdateCategory, onReorderCategoryList, onRemoveCategory }) => {
    const [isAdding, setIsAdding] = useState(null);
    const [newCatName, setNewCatName] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('Star');
    const [showIconPicker, setShowIconPicker] = useState(false);

    const handleAddSubmit = () => {
        if (newCatName && isAdding) {
            onAddCategory(isAdding, newCatName, newCatIcon);
            setIsAdding(null);
            setNewCatName('');
            setNewCatIcon('Star');
        }
    };

    const moveRow = (type, fromIndex, toIndex) => {
        const list = type === 'income' ? [...incomeCategories] : [...expenseCategories];
        const [movedItem] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, movedItem);
        onReorderCategoryList(type, list);
    };

    // Calculations
    const totalIncome = incomeCategories.reduce((sum, cat) => sum + (Number(values[cat.id]) || 0), 0);
    const totalCategoryExpenses = expenseCategories.reduce((sum, cat) => sum + (Number(values[cat.id]) || 0), 0);
    const totalDebtPayments = debts.reduce((sum, d) => sum + Number(d.monthlyPayment) + Number(d.insurance || 0), 0);

    const totalExpenses = totalCategoryExpenses + totalDebtPayments;

    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    const getIcon = (iconName) => {
        const Icon = ICON_MAP[iconName] || MoreHorizontal;
        return <Icon size={20} />;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Icon Picker Modal (for adding) */}
            {showIconPicker && (
                <IconPicker
                    selectedIcon={newCatIcon}
                    onSelect={(icon) => { setNewCatIcon(icon); setShowIconPicker(false); }}
                    onClose={() => setShowIconPicker(false)}
                />
            )}

            {/* Add Category Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 m-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Add {isAdding === 'income' ? 'Income' : 'Expense'} Category</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                    placeholder="e.g. Freelance"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Icon</label>
                                <button
                                    onClick={() => setShowIconPicker(true)}
                                    className="flex items-center gap-2 px-3 py-2 border rounded-lg w-full hover:bg-slate-50 transition-colors"
                                >
                                    {getIcon(newCatIcon)}
                                    <span className="text-slate-600">{newCatIcon}</span>
                                </button>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleAddSubmit} className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-medium">Add</button>
                                <button onClick={() => setIsAdding(null)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-medium">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Static Header */}
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white rounded-xl">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Monthly Budget</h2>
                        <p className="text-slate-500">Recurring monthly income and expenses</p>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-500 text-white p-6 rounded-3xl shadow-lg shadow-emerald-500/20 relative overflow-hidden">
                    <div className="relative z-10"><p className="text-emerald-100 font-medium mb-1">Total Income</p><h3 className="text-4xl font-bold">{totalIncome.toLocaleString()}€</h3></div>
                    <TrendingUp className="absolute right-4 bottom-4 text-emerald-400/50" size={80} />
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="relative z-10"><p className="text-slate-500 font-medium mb-1">Total Expenses</p><h3 className="text-4xl font-bold text-slate-900">{totalExpenses.toLocaleString()}€</h3></div>
                    <TrendingDown className="absolute right-4 bottom-4 text-rose-100" size={80} />
                </div>
                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg shadow-slate-900/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-slate-400 font-medium mb-1">Savings Rate</p>
                        <div className="flex items-baseline gap-2"><h3 className="text-4xl font-bold">{Math.round(savingsRate)}%</h3><span className="text-slate-400">({savings.toLocaleString()}€)</span></div>
                    </div>
                    <PiggyBank className="absolute right-4 bottom-4 text-slate-700" size={80} />
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-800"><div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }} /></div>
                </div>
            </div>

            {/* Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Income */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><span className="w-2 h-6 bg-emerald-500 rounded-full" /> Income Sources</h3>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
                        {incomeCategories.map((cat, index) => (
                            <DraggableCategoryRow
                                key={cat.id}
                                index={index}
                                cat={cat}
                                value={values[cat.id] || 0}
                                onValueChange={(id, val) => onValueChange(id, val)}
                                onUpdate={(id, updates) => onUpdateCategory('income', id, updates)}
                                onRemove={(id) => onRemoveCategory('income', id)}
                                moveRow={(from, to) => moveRow('income', from, to)}
                                type="income"
                                totalIncome={totalIncome}
                            />
                        ))}
                        <button onClick={() => setIsAdding('income')} className="w-full p-3 text-sm font-medium text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> Add Income Source</button>
                    </div>
                </div>

                {/* Expenses */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><span className="w-2 h-6 bg-rose-500 rounded-full" /> Expenses</h3>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">

                        {/* Static Debt Rows */}
                        {debts.map(debt => (
                            <StaticDebtRow key={debt.id} debt={debt} totalIncome={totalIncome} />
                        ))}

                        {expenseCategories.map((cat, index) => (
                            <DraggableCategoryRow
                                key={cat.id}
                                index={index}
                                cat={cat}
                                value={values[cat.id] || 0}
                                onValueChange={(id, val) => onValueChange(id, val)}
                                onUpdate={(id, updates) => onUpdateCategory('expense', id, updates)}
                                onRemove={(id) => onRemoveCategory('expense', id)}
                                moveRow={(from, to) => moveRow('expense', from, to)}
                                type="expense"
                                totalIncome={totalIncome}
                            />
                        ))}
                        <button onClick={() => setIsAdding('expense')} className="w-full p-3 text-sm font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> Add Expense Category</button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Budget;
