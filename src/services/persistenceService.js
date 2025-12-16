import { load } from '@tauri-apps/plugin-store';

const STORE_FILENAME = 'klaro_db.json';
const STORAGE_KEY = 'klaro_full_data';

// Helper to check if running in Tauri
const isTauri = () => !!window.__TAURI_INTERNALS__;

let store = null;

const initStore = async () => {
    if (!isTauri()) return false;
    try {
        if (!store) {
            store = await load(STORE_FILENAME, { autoSave: true });
        }
        return true;
    } catch (e) {
        console.error("Failed to init Tauri store", e);
        return false;
    }
};

export const persistenceService = {
    // Helper to ensure data structure is complete
    _sanitize(data) {
        return {
            assets: Array.isArray(data?.assets) ? data.assets : [],
            budget: {
                values: data?.budget?.values || {},
                incomeCategories: Array.isArray(data?.budget?.incomeCategories) ? data.budget.incomeCategories : [
                    { id: 'inc_salary', name: 'Salary', icon: 'Briefcase' },
                    { id: 'inc_bonus', name: 'Bonus', icon: 'Star' }
                ],
                expenseCategories: Array.isArray(data?.budget?.expenseCategories) ? data.budget.expenseCategories : [
                    { id: 'exp_rent', name: 'Rent', icon: 'Home' },
                    { id: 'exp_food', name: 'Groceries', icon: 'ShoppingCart' }
                ]
            },
            debts: Array.isArray(data?.debts) ? data.debts : [],
            events: Array.isArray(data?.events) ? data.events : [],
            investmentGoal: data?.investmentGoal || 0,
            settings: data?.settings || { currency: 'EUR' },
            lastUpdated: data?.lastUpdated || Date.now()
        };
    },

    // Load all data (Assets, Budget, Settings)
    async loadData() {
        let data = null;

        // 1. Try Tauri Store
        if (await initStore()) {
            try {
                data = await store.get(STORAGE_KEY);
            } catch (e) {
                console.error("Error reading from Tauri store", e);
            }
        }

        // 2. Fallback to LocalStorage
        if (!data) {
            const local = localStorage.getItem(STORAGE_KEY);
            if (local) {
                try {
                    data = JSON.parse(local);
                } catch (e) {
                    console.error("Error parsing LocalStorage data", e);
                }
            }
        }

        // 3. Migration: If no unified data, try to load old separate keys
        if (!data) {
            console.log("No unified data found, attempting migration...");
            const oldAssets = localStorage.getItem('klaro_assets');
            const oldBudget = localStorage.getItem('klaro_budget'); // Assuming this was the key

            if (oldAssets || oldBudget) {
                data = {
                    assets: oldAssets ? JSON.parse(oldAssets) : [],
                    budget: oldBudget ? JSON.parse(oldBudget) : {},
                    debts: [],
                    events: [],
                    settings: {},
                    lastUpdated: Date.now()
                };
                // Save immediately to unify
                await this.saveData(this._sanitize(data));
                return this._sanitize(data);
            }
        }

        // 4. Return sanitized data or default
        return this._sanitize(data || {});
    },

    // Save all data
    async saveData(data) {
        const payload = {
            ...data,
            lastUpdated: Date.now()
        };

        // 1. Save to Tauri Store
        if (await initStore()) {
            try {
                await store.set(STORAGE_KEY, payload);
                await store.save();
            } catch (e) {
                console.error("Failed to save to Tauri store", e);
            }
        }

        // 2. Always backup to LocalStorage (for redundancy/web access)
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            console.error("Failed to save to LocalStorage", e);
        }
    },

    // Export data to JSON file
    exportData(data) {
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `klaro_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    // Import data from JSON file
    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const data = JSON.parse(content);

                    // Basic validation
                    if (!data || typeof data !== 'object') {
                        throw new Error("Invalid file format");
                    }

                    // Ensure structure
                    const sanitized = {
                        assets: Array.isArray(data.assets) ? data.assets : [],
                        budget: data.budget || {},
                        debts: Array.isArray(data.debts) ? data.debts : [],
                        events: Array.isArray(data.events) ? data.events : [],
                        settings: data.settings || {},
                        lastUpdated: Date.now()
                    };

                    await this.saveData(sanitized);
                    resolve(sanitized);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsText(file);
        });
    }
};
