import React, { useState } from 'react';
import { Plus, Trash2, Calendar, Repeat, DollarSign, Edit2, X, Check, Copy } from 'lucide-react';

const EventManager = ({ events, onAddEvent, onRemoveEvent, onUpdateEvent }) => {
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
            name: `${event.name} (Copy)`
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
                    <h2 className="text-xl font-bold text-slate-900">Future Events</h2>
                    <p className="text-slate-500 text-sm">Plan for one-off expenses or recurring bonuses.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => { setIsAdding(true); setEditingId(null); }}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        <Plus size={18} />
                        Add Event
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">{editingId ? 'Edit Event' : 'New Event'}</h3>
                        <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Event Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Summer Bonus"
                                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                            <input
                                type="number"
                                placeholder="Positive for income, negative for expense"
                                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input
                                type="date"
                                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Recurrence</label>
                            <select
                                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={formData.recurrence}
                                onChange={e => setFormData({ ...formData, recurrence: e.target.value })}
                            >
                                <option value="none">One-time</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                                <option value="custom">Custom (Every X Months)</option>
                            </select>
                        </div>
                        {formData.recurrence === 'custom' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Interval (Months)</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.interval}
                                    onChange={e => setFormData({ ...formData, interval: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium">
                            {editingId ? 'Update Event' : 'Save Event'}
                        </button>
                        <button type="button" onClick={resetForm} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 gap-4">
                {events.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                        <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">No future events planned yet.</p>
                        <button onClick={() => setIsAdding(true)} className="text-slate-900 font-medium mt-2 hover:underline">Add your first event</button>
                    </div>
                ) : (
                    events.map(event => (
                        <div key={event.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${event.amount >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {event.amount >= 0 ? <DollarSign size={20} /> : <DollarSign size={20} />}
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-slate-900 cursor-pointer hover:text-blue-600 hover:underline decoration-blue-600/30 underline-offset-4 transition-all"
                                        onClick={() => startEditing(event)}
                                        title="Click to edit"
                                    >
                                        {event.name}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-slate-500">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(event.date).toLocaleDateString()}</span>
                                        {event.recurrence !== 'none' && (
                                            <span className="flex items-center gap-1">
                                                <Repeat size={12} />
                                                {event.recurrence === 'monthly' && 'Monthly'}
                                                {event.recurrence === 'yearly' && 'Yearly'}
                                                {event.recurrence === 'custom' && `Every ${event.interval} months`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold text-lg mr-2 ${event.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {event.amount > 0 ? '+' : ''}{Number(event.amount).toLocaleString()}€
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDuplicate(event)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Duplicate"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button
                                        onClick={() => startEditing(event)}
                                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => onRemoveEvent(event.id)}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
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
