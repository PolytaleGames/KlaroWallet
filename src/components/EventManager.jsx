import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import {
    Plus, Trash2, Calendar, Repeat, DollarSign,
    Edit2, X, Check, Copy, TrendingUp, TrendingDown,
    ArrowRight, Filter, CalendarPlus, Sparkles
} from 'lucide-react';
import { cn } from '../utils';

const EventManager = ({ events, onAddEvent, onRemoveEvent, onUpdateEvent }) => {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();

    // UI States
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [filter, setFilter] = useState('all'); // all, income, expense
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        type: 'expense', // 'income' or 'expense' - strictly for UI handling of sign
        date: new Date().toISOString().split('T')[0],
        endDate: '',
        recurrence: 'none',
        interval: 1
    });

    // Reset Form
    const resetForm = () => {
        setFormData({
            name: '',
            amount: '',
            type: 'expense',
            date: new Date().toISOString().split('T')[0],
            endDate: '',
            recurrence: 'none',
            interval: 1
        });
        setEditingId(null);
        setIsComposerOpen(false);
    };

    // Initialize Edit
    const startEditing = (event) => {
        const amount = Number(event.amount);
        setFormData({
            ...event,
            amount: Math.abs(amount),
            type: amount >= 0 ? 'income' : 'expense',
            endDate: event.endDate || '',
            interval: event.interval || 1
        });
        setEditingId(event.id);
        setIsComposerOpen(true);
    };

    // Handle Submit
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.amount || !formData.date) return;

        const finalAmount = Number(formData.amount) * (formData.type === 'expense' ? -1 : 1);

        const payload = {
            ...formData,
            amount: finalAmount,
            interval: Number(formData.interval)
        };
        // Remove 'type' from payload, it's just local state
        delete payload.type;

        if (editingId) {
            onUpdateEvent({ ...payload, id: editingId });
        } else {
            onAddEvent({ ...payload, id: Date.now().toString() });
        }
        resetForm();
    };

    const handleDuplicate = (e, event) => {
        e.stopPropagation();
        onAddEvent({
            ...event,
            id: Date.now().toString(),
            name: `${event.name} ${t('copy_suffix')}`
        });
    };

    // Compute Derived Data: Generate timeline items (occurrences)
    const timelineItems = useMemo(() => {
        let allInstances = [];
        const NOW = new Date();
        NOW.setHours(0, 0, 0, 0); // Normalize today

        events.forEach(event => {
            const startDate = new Date(event.date);

            if (event.recurrence === 'none') {
                allInstances.push({
                    ...event,
                    originalId: event.id,
                    uniqueId: event.id,
                    dateObj: startDate
                });
            } else {
                // Generate next occurrences
                let currentDate = new Date(startDate);
                let count = 0;

                while (count < 50) {
                    // Check End Date Limit
                    if (event.endDate && currentDate > new Date(event.endDate)) break;

                    allInstances.push({
                        ...event,
                        originalId: event.id,
                        uniqueId: `${event.id}_${count}`,
                        dateObj: new Date(currentDate)
                    });

                    // Advance date
                    if (event.recurrence === 'weekly') {
                        currentDate.setDate(currentDate.getDate() + 7);
                    } else if (event.recurrence === 'monthly') {
                        currentDate.setMonth(currentDate.getMonth() + 1);
                    } else if (event.recurrence === 'yearly') {
                        currentDate.setFullYear(currentDate.getFullYear() + 1);
                    } else if (event.recurrence === 'custom') {
                        currentDate.setMonth(currentDate.getMonth() + (event.interval || 1));
                    }

                    count++;
                }
            }
        });

        // Filter by Type
        const typeFiltered = allInstances.filter(e => {
            if (filter === 'income') return e.amount >= 0;
            if (filter === 'expense') return e.amount < 0;
            return true;
        });

        // Sort by Date
        typeFiltered.sort((a, b) => a.dateObj - b.dateObj);

        // Slice to 30
        return typeFiltered.slice(0, 30);
    }, [events, filter]);

    const impactStats = useMemo(() => {
        const income = events.filter(e => e.amount > 0).reduce((a, b) => a + Number(b.amount), 0);
        const expense = events.filter(e => e.amount < 0).reduce((a, b) => a + Number(b.amount), 0);
        return { income, expense, total: income + expense };
    }, [events]);


    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Stats Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                        {t('future_events')}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-lg leading-relaxed">
                        {t('future_events_desc')}
                    </p>
                </div>

                {/* Micro Stats REMOVED as requested */}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md py-4 -my-4 px-2 -mx-2">
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    {['all', 'income', 'expense'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                                filter === f
                                    ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-md"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                            )}
                        >
                            {t(`filter_${f}`)}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => { setIsComposerOpen(true); setEditingId(null); }}
                    className="group relative overflow-hidden bg-slate-900 dark:bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-slate-900/20 dark:shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <div className="relative flex items-center gap-2 font-bold text-sm">
                        <CalendarPlus size={18} className="text-indigo-200" />
                        {t('new_event')}
                    </div>
                </button>
            </div>

            {/* Composer Modal / Card - Use createPortal to ensure centering over everything */}
            {isComposerOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-700">
                        {/* Composer Header */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10 backdrop-blur-md">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {editingId ? <Edit2 size={20} className="text-blue-500" /> : <CalendarPlus size={20} className="text-indigo-500" />}
                                    {editingId ? t('edit_event') : t('new_event')}
                                </h3>
                                <p className="text-sm text-slate-400">{t('define_event_details')}</p>
                            </div>
                            <button onClick={resetForm} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Composer Form */}
                        <form onSubmit={handleSubmit} className="p-8 space-y-8">

                            {/* 1. Type & Amount Group */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('transaction_type')}</label>
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'income' })}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all",
                                                formData.type === 'income'
                                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                                    : "border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300"
                                            )}
                                        >
                                            <TrendingUp size={18} />
                                            {t('income')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'expense' })}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all",
                                                formData.type === 'expense'
                                                    ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                                                    : "border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300"
                                            )}
                                        >
                                            <TrendingDown size={18} />
                                            {t('expense')}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('amount')}</label>
                                    <div className="relative group">
                                        <span className={cn(
                                            "absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg transition-colors",
                                            formData.type === 'income' ? "text-emerald-500" : "text-rose-500"
                                        )}>€</span>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-300"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Details Group */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('event_name')}</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Annual Bonus, Car Repair, Ski Trip..."
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                    required
                                />
                            </div>

                            {/* 3. Logic Group */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('date')}</label>
                                    <div className="relative">
                                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('recurrence')}</label>
                                    <div className="relative">
                                        <Repeat size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select
                                            value={formData.recurrence}
                                            onChange={e => setFormData({ ...formData, recurrence: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white appearance-none"
                                        >
                                            <option value="none">{t('one_time')}</option>
                                            <option value="weekly">{t('weekly')}</option>
                                            <option value="monthly">{t('monthly')}</option>
                                            <option value="yearly">{t('yearly')}</option>
                                            <option value="custom">{t('custom_interval')}</option>
                                        </select>
                                    </div>
                                    {formData.recurrence === 'custom' && (
                                        <div className="animate-in slide-in-from-top-2 pt-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-500">{t('interval_every')}</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formData.interval}
                                                    onChange={e => setFormData({ ...formData, recurrence: 'custom', interval: e.target.value })}
                                                    className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold text-slate-900 dark:text-white"
                                                />
                                                <span className="text-sm text-slate-500">{t('interval_months_unit')}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* End Date Input (Only for Recurrent) */}
                                    {formData.recurrence !== 'none' && (
                                        <div className="animate-in slide-in-from-top-2 pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                                                {t('end_date')} <span className="text-[10px] font-normal opacity-50">{t('optional')}</span>
                                            </label>
                                            <div className="relative mt-2">
                                                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="date"
                                                    value={formData.endDate || ''}
                                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white placeholder-slate-400"
                                                    placeholder="Optional"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] bg-slate-900 dark:bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Check size={20} />
                                    {editingId ? t('update_event') : t('save_event')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Timeline View */}
            <div className="relative space-y-8">
                {/* Vertical Timeline Line */}
                <div className="absolute left-[42px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent dark:from-slate-700 dark:via-slate-800 hidden md:block"></div>

                {timelineItems.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Sparkles size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No events found</h3>
                        <p className="text-slate-500 text-sm">{t('no_events_planned')}</p>
                        <button onClick={() => setIsComposerOpen(true)} className="mt-6 text-indigo-500 font-bold hover:underline">
                            {t('add_first_event')}
                        </button>
                    </div>
                ) : (
                    (() => {
                        // Group items by date for the calendar view
                        const groupedEvents = timelineItems.reduce((acc, event) => {
                            const key = event.dateObj.toISOString().split('T')[0];
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(event);
                            return acc;
                        }, {});

                        return Object.entries(groupedEvents).map(([dateKey, dayEvents], groupIndex) => {
                            const dateObj = new Date(dateKey);

                            return (
                                <div
                                    key={dateKey}
                                    className="relative flex gap-6 md:pl-0 animate-in slide-in-from-bottom-2 duration-500"
                                    style={{ animationDelay: `${groupIndex * 50}ms` }}
                                >
                                    {/* Desktop "Tear-off Calendar" Node */}
                                    <div className="hidden md:flex flex-col items-center flex-shrink-0 z-10">
                                        <div className="w-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            {/* Month Top */}
                                            <div className="bg-slate-900 dark:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1">
                                                {dateObj.toLocaleDateString(i18n.language, { month: 'short' })}
                                            </div>
                                            {/* Day Middle */}
                                            <div className="flex items-center justify-center h-12 bg-white dark:bg-slate-800">
                                                <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                                                    {dateObj.getDate()}
                                                </span>
                                            </div>
                                            {/* Year Bottom */}
                                            <div className="bg-slate-50 dark:bg-slate-900/50 text-center py-1 border-t border-slate-100 dark:border-slate-700">
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {dateObj.getFullYear()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Events List for this Day */}
                                    <div className="flex-1 space-y-3 pt-2">
                                        {/* Mobile Date Header */}
                                        <div className="md:hidden flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                                            <Calendar size={12} />
                                            {dateObj.toLocaleDateString(i18n.language, { dateStyle: 'medium' })}
                                        </div>

                                        {dayEvents.map(event => {
                                            const isIncome = event.amount >= 0;
                                            return (
                                                <div
                                                    key={event.uniqueId}
                                                    onClick={() => startEditing(event)}
                                                    className={cn(
                                                        "bg-white dark:bg-slate-800 p-3 sm:px-4 rounded-xl border transition-all cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md group flex items-center justify-between gap-4",
                                                        isIncome
                                                            ? "border-l-4 border-l-emerald-500 border-y-slate-100 border-r-slate-100 dark:border-y-slate-700 dark:border-r-slate-700"
                                                            : "border-l-4 border-l-rose-500 border-y-slate-100 border-r-slate-100 dark:border-y-slate-700 dark:border-r-slate-700"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <h4 className="font-bold text-slate-900 dark:text-white truncate text-base group-hover:text-indigo-500 transition-colors">
                                                            {event.name}
                                                        </h4>
                                                        {event.recurrence !== 'none' && (
                                                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[9px] font-bold uppercase text-slate-500 tracking-wide flex items-center gap-1 flex-shrink-0">
                                                                <Repeat size={10} />
                                                                {event.recurrence === 'custom' ? `${event.interval}mo` : event.recurrence}
                                                                {event.recurrence === 'weekly' && '/w'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-4 flex-shrink-0">
                                                        {/* Actions (Reveal on Group Hover) */}
                                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                            <button
                                                                onClick={(e) => handleDuplicate(e, event)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-500 transition-colors"
                                                                title={t('duplicate')}
                                                            >
                                                                <Copy size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onRemoveEvent(event.originalId); }}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/50 hover:text-rose-500 transition-colors"
                                                                title={t('delete')}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>

                                                        <p className={cn(
                                                            "font-bold font-mono tracking-tight text-lg",
                                                            isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                                        )}>
                                                            {isIncome ? '+' : ''}{Number(event.amount).toLocaleString()}€
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        });
                    })()
                )}
            </div>
        </div>
    );
};

export default EventManager;
