import React from 'react';
import { AlertTriangle } from 'lucide-react';

const Settings = ({ onReset }) => {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold mb-4 text-slate-900">About Klaro</h3>
                <p className="text-slate-600">
                    Klaro is your personal finance dashboard. All data is stored locally on your device.
                </p>
            </div>

            <div className="bg-rose-50 p-6 rounded-xl border border-rose-100 mt-8">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-rose-100 rounded-full text-rose-600">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-rose-900">Danger Zone</h3>
                        <p className="text-rose-700 mb-4">This will permanently delete all your data and reset the app to its default state.</p>
                        <button
                            onClick={onReset}
                            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
                        >
                            Reset All Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
