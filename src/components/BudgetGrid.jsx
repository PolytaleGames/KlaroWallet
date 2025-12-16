import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const EditableCell = ({ value, onChange, className }) => {
    return (
        <td className={cn("p-1", className)}>
            <input
                type="number"
                value={value === 0 ? '' : value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-full px-3 py-1.5 rounded text-sm text-slate-700 font-mono hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-300"
                placeholder="-"
            />
        </td>
    );
};

const BudgetGrid = ({ data, incomeCategories, expenseCategories, onCellChange }) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 font-medium sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Month</th>
                            <th className="px-4 py-3 font-medium">Start Bal.</th>

                            {/* Dynamic Income Headers */}
                            {incomeCategories.map(cat => (
                                <th key={cat.id} className="px-4 py-3 font-medium text-emerald-600 whitespace-nowrap">
                                    {cat.name}
                                </th>
                            ))}

                            {/* Dynamic Expense Headers */}
                            {expenseCategories.map(cat => (
                                <th key={cat.id} className="px-4 py-3 font-medium text-rose-600 whitespace-nowrap">
                                    {cat.name}
                                </th>
                            ))}

                            <th className="px-4 py-3 font-medium bg-slate-100 whitespace-nowrap">Final Bal.</th>
                            <th className="px-4 py-3 font-medium text-blue-600 border-l border-slate-200 whitespace-nowrap">Assets</th>
                            <th className="px-4 py-3 font-medium text-rose-600 whitespace-nowrap">Total Debt</th>
                            <th className="px-4 py-3 font-medium bg-slate-100 whitespace-nowrap">Net Worth</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row, index) => (
                            <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-4 py-2 font-medium text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    {row.month}
                                </td>
                                <td className="px-4 py-2 text-slate-500 font-mono">
                                    {Math.round(row.startBalance)}€
                                </td>

                                {/* Dynamic Income Cells */}
                                {incomeCategories.map(cat => (
                                    <EditableCell
                                        key={cat.id}
                                        value={row.values[cat.id] || 0}
                                        onChange={(val) => onCellChange(index, cat.id, val)}
                                    />
                                ))}

                                {/* Dynamic Expense Cells */}
                                {expenseCategories.map(cat => (
                                    <EditableCell
                                        key={cat.id}
                                        value={row.values[cat.id] || 0}
                                        onChange={(val) => onCellChange(index, cat.id, val)}
                                    />
                                ))}

                                <td className={cn(
                                    "px-4 py-2 font-bold font-mono bg-slate-50/50",
                                    row.finalBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    {Math.round(row.finalBalance)}€
                                </td>

                                <EditableCell
                                    value={row.assets}
                                    onChange={(val) => onCellChange(index, 'assets', val)}
                                    className="border-l border-slate-200"
                                />

                                <td className="px-4 py-2 text-rose-600 font-mono">
                                    {Math.round(row.totalDebt)}€
                                </td>

                                <td className={cn(
                                    "px-4 py-2 font-bold font-mono bg-slate-50/50",
                                    row.netWorth >= 0 ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    {Math.round(row.netWorth)}€
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BudgetGrid;
