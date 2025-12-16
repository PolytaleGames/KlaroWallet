import { load } from '@tauri-apps/plugin-store';

const STORE_PATH = 'klaro_data.json';
let store = null;

// Initialize store if in Tauri environment
const initStore = async () => {
    if (window.__TAURI_INTERNALS__) {
        try {
            store = await load(STORE_PATH, { autoSave: true });
            return true;
        } catch (e) {
            console.error("Failed to load Tauri store", e);
            return false;
        }
    }
    return false;
};

export const storageService = {
    async getItem(key, defaultValue) {
        // Try Tauri Store first
        if (window.__TAURI_INTERNALS__) {
            if (!store) await initStore();
            if (store) {
                const val = await store.get(key);
                return val !== null ? val : defaultValue;
            }
        }

        // Fallback to LocalStorage
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    },

    async setItem(key, value) {
        // Try Tauri Store first
        if (window.__TAURI_INTERNALS__) {
            if (!store) await initStore();
            if (store) {
                await store.set(key, value);
                await store.save(); // Ensure save
                return;
            }
        }

        // Fallback to LocalStorage
        localStorage.setItem(key, JSON.stringify(value));
    }
};
