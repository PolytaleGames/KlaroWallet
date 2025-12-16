import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Plus, Trash2, Calendar, Repeat, DollarSign, Edit2, X, Check, Copy } from 'lucide-react';

const EventManager = ({ events, onAddEvent, onRemoveEvent, onUpdateEvent }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        recurrence: 'none', // none, monthly, yearly, custom
        interval: 1 // used for custom (every X months)
    });

    const resetForm = () => {
        setFormData({
            name: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            recurrence: 'none',
            interval: 1
        });
        setEditingId(null);
        setIsAdding(false);
    };

    const startEditing = (event) => {
        setFormData({
            ...event,
            amount: event.amount, // Keep as number or string, input handles it
            interval: event.interval || 1
        });
        setEditingId(event.id);
        setIsAdding(true);
    };

    const handleDuplicate = (event) => {
        onAddEvent({
            ...event,
            id: Date.now().toString(),
            name: `${event.name} ${t('copy_suffix')}`
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.amount || !formData.date) return;

        const payload = {
            ...formData,
            amount: Number(formData.amount),
            interval: Number(formData.interval)
        };

        if (editingId) {
            onUpdateEvent({ ...payload, id: editingId });
        } else {
            onAddEvent({ ...payload, id: Date.now().toString() });
        }

        resetForm();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('future_events')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{t('future_events_desc')}</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => { setIsAdding(true); setEditingId(null); }}
                        className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors"
                    >
                        <Plus size={18} />
                        {t('add_event')}
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{editingId ? t('edit_event') : t('new_event')}</h3>
                        <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('event_name')}</label>
                            <input
                                type="text"
                                placeholder="e.g., Summer Bonus"
                                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('amount')}</label>
                            <input
                                type="number"
                                placeholder={t('positive_for_income')}
                                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('date')}</label>
                            <input
                                type="date"
                                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('recurrence')}</label>
                            <select
                                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                value={formData.recurrence}
                                onChange={e => setFormData({ ...formData, recurrence: e.target.value })}
                            >
                                <option value="none">{t('one_time')}</option>
                                <option value="monthly">{t('monthly')}</option>
                                <option value="yearly">{t('yearly')}</option>
                                <option value="custom">{t('custom_interval')}</option>
                            </select>
                        </div>
                        {formData.recurrence === 'custom' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('interval_months')}</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                    value={formData.interval}
                                    onChange={e => setFormData({ ...formData, interval: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-slate-900 dark:bg-indigo-600 text-white py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors font-medium">
                            {editingId ? t('update_event') : t('save_event')}
                        </button>
                        <button type="button" onClick={resetForm} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {t('cancel')}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 gap-4">
                {events.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-slate-500 dark:text-slate-400">{t('no_events_planned')}</p>
                        <button onClick={() => setIsAdding(true)} className="text-slate-900 dark:text-white font-medium mt-2 hover:underline">{t('add_first_event')}</button>
                    </div>
                ) : (
                    events.map(event => (
                        <div key={event.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${event.amount >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                                    {event.amount >= 0 ? <DollarSign size={20} /> : <DollarSign size={20} />}
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline decoration-blue-600/30 dark:decoration-blue-400/30 underline-offset-4 transition-all"
                                        onClick={() => startEditing(event)}
                                        title="Click to edit"
                                    >
                                        {event.name}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(event.date).toLocaleDateString()}</span>
                                        {event.recurrence !== 'none' && (
                                            <span className="flex items-center gap-1">
                                                <Repeat size={12} />
                                                {event.recurrence === 'monthly' && t('monthly')}
                                                {event.recurrence === 'yearly' && t('yearly')}
                                                {event.recurrence === 'custom' && t('every_x_months', { count: event.interval })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold text-lg mr-2 ${event.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {event.amount > 0 ? '+' : ''}{Number(event.amount).toLocaleString()}€
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDuplicate(event)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                        title="Duplicate"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button
                                        onClick={() => startEditing(event)}
                                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => onRemoveEvent(event.id)}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EventManager;
