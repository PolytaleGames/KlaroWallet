import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Plus, Trash2, Edit2, TrendingUp, DollarSign, Wallet, Briefcase, Landmark, Coins, Home, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { priceService } from '../services/priceService';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const ASSET_TYPES = [
    { id: 'cash', translationKey: 'asset_cash', icon: Wallet, color: 'emerald' },
    { id: 'stock', translationKey: 'asset_stock', icon: TrendingUp, color: 'blue' },
    { id: 'crypto', translationKey: 'asset_crypto', icon: Coins, color: 'violet' },
    { id: 'metal', translationKey: 'asset_metal', icon: Landmark, color: 'amber' },
    { id: 'real_estate', translationKey: 'asset_real_estate', icon: Home, color: 'rose' },
    { id: 'other', translationKey: 'asset_other', icon: Briefcase, color: 'slate' },
];

const AssetForm = ({ initialData, onSubmit, onCancel }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState(initialData || {
        name: '',
        ticker: '',
        type: 'cash',
        isQuantified: false,
        quantity: '',
        unitPrice: '',
        totalValue: '',
        originalCurrency: 'EUR',
        originalUnitPrice: null,
        exchangeRate: 1
    });

    const [searchQuery, setSearchQuery] = useState(initialData?.ticker || '');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery && searchQuery.length >= 2 && !initialData) {
                setIsSearching(true);
                try {
                    const results = await priceService.search(searchQuery);
                    setSearchResults(results);
                } catch (e) {
                    console.error("Search failed", e);
                }
                setIsSearching(false);
                setShowResults(true);
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSelectAsset = async (asset) => {
        setShowResults(false);
        setSearchQuery(asset.symbol);

        // Auto-configure form
        setFormData(prev => ({
            ...prev,
            name: asset.name,
            ticker: asset.symbol,
            type: asset.type === 'CRYPTOCURRENCY' ? 'crypto' : 'stock', // Simple mapping
            isQuantified: true
        }));

        // Fetch Price
        setIsFetchingPrice(true);
        try {
            const data = await priceService.getPrice(asset.symbol);
            if (data) {
                let finalPrice = data.price;
                let rate = 1;

                if (data.currency && data.currency !== 'EUR') {
                    rate = await priceService.getExchangeRate(data.currency, 'EUR');
                    finalPrice = data.price * rate;
                }

                setFormData(prev => ({
                    ...prev,
                    unitPrice: finalPrice,
                    originalCurrency: data.currency,
                    originalUnitPrice: data.price,
                    exchangeRate: rate
                }));
            }
        } catch (e) {
            console.error("Price fetch failed", e);
        }
        setIsFetchingPrice(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        let finalValue = 0;
        if (formData.isQuantified) {
            finalValue = (Number(formData.quantity) || 0) * (Number(formData.unitPrice) || 0);
        } else {
            finalValue = Number(formData.totalValue) || 0;
        }

        onSubmit({
            ...formData,
            value: finalValue
        });
    };

    const selectedType = ASSET_TYPES.find(t => t.id === formData.type) || ASSET_TYPES[0];

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{initialData ? t('edit_asset') : t('add_new_asset')}</h3>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Search / Ticker Input - ONLY FOR NEW ASSETS */}
                    {!initialData && (
                        <div className="relative z-20">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('search_asset')}</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400">🔍</span>
                                <input
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                                    placeholder="e.g. Total, Bitcoin, Apple"
                                    className="w-full pl-10 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    autoFocus
                                />
                                {isSearching && <span className="absolute right-3 top-3 text-slate-400 animate-spin">↻</span>}
                            </div>

                            {/* Search Results Dropdown */}
                            {showResults && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700">
                                    {searchResults.map((result) => (
                                        <button
                                            key={result.symbol}
                                            type="button"
                                            onClick={() => handleSelectAsset(result)}
                                            className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex justify-between items-center group"
                                        >
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{result.symbol}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{result.name}</p>
                                            </div>
                                            <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded group-hover:bg-white dark:group-hover:bg-slate-600">{result.exchange}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Type Selection - ONLY FOR NEW ASSETS */}
                    {!initialData && (
                        <div className="grid grid-cols-3 gap-2">
                            {ASSET_TYPES.map(type => {
                                const Icon = type.icon;
                                const isSelected = formData.type === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
                                            isSelected
                                                ? `bg-${type.color}-50 dark:bg-${type.color}-900/20 border-${type.color}-500 text-${type.color}-700 dark:text-${type.color}-300 ring-1 ring-${type.color}-500`
                                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        <Icon size={20} className="mb-1" />
                                        <span className="text-xs font-medium">{t(type.translationKey)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Name & Ticker - ONLY FOR NEW ASSETS */}
                    {!initialData && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('asset_name')}</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Livret A"
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    required
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('ticker_optional')}</label>
                                <div className="relative">
                                    <input
                                        name="ticker"
                                        value={formData.ticker}
                                        onChange={handleChange}
                                        placeholder="e.g. TTE.PA, BTC-USD"
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none uppercase dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quantified Toggle - ONLY FOR NEW ASSETS */}
                    {!initialData && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isQuantified"
                                name="isQuantified"
                                checked={formData.isQuantified}
                                onChange={handleChange}
                                disabled={!!formData.ticker}
                                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:opacity-50"
                            />
                            <label htmlFor="isQuantified" className="text-sm text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                                {t('track_quantity')} {formData.ticker && <span className="text-slate-400 dark:text-slate-500">({t('required_for_ticker')})</span>}
                            </label>
                        </div>
                    )}

                    {/* EDIT MODE HEADER */}
                    {initialData && (
                        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-100 dark:border-slate-600 mb-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('editing')}</p>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-slate-900 dark:text-white">{formData.name}</span>
                                {formData.ticker && <span className="text-xs font-bold px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded uppercase">{formData.ticker}</span>}
                            </div>
                        </div>
                    )}

                    {formData.isQuantified ? (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('quantity')}</label>
                                <input
                                    name="quantity"
                                    type="number"
                                    step="any"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    placeholder="10"
                                    className="w-full px-4 py-3 text-lg font-bold border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    required
                                    autoFocus={!!initialData}
                                />
                            </div>

                            {/* Unit Price - Read Only in Edit Mode usually, but let's keep it visible/editable if no ticker */}
                            <div className="relative col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('unit_price')}</label>
                                <input
                                    name="unitPrice"
                                    type="number"
                                    step="any"
                                    value={formData.unitPrice}
                                    onChange={handleChange}
                                    placeholder="60.50"
                                    readOnly={!!formData.ticker}
                                    className={cn(
                                        "w-full px-4 py-3 text-lg font-bold border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white",
                                        formData.ticker ? "bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed" : ""
                                    )}
                                    required
                                />
                                {isFetchingPrice && <span className="absolute right-3 top-9 text-slate-400 animate-spin">↻</span>}
                            </div>

                            {formData.originalCurrency && formData.originalCurrency !== 'EUR' && (
                                <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800">
                                    {t('converted_from')} {Number(formData.originalUnitPrice).toFixed(2)} {formData.originalCurrency}
                                    (Rate: {Number(formData.exchangeRate).toFixed(4)})
                                </div>
                            )}

                            <div className="col-span-2 md:col-span-1 bg-slate-50 dark:bg-slate-700 p-3 rounded-xl flex flex-col justify-center">
                                <span className="text-sm text-slate-500 dark:text-slate-400">{t('calculated_total')}</span>
                                <span className="font-bold text-slate-900 dark:text-white text-lg">
                                    {((Number(formData.quantity) || 0) * (Number(formData.unitPrice) || 0)).toLocaleString()}€
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('total_value')}</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-4 text-slate-400" />
                                <input
                                    name="totalValue"
                                    type="number"
                                    step="any"
                                    value={formData.totalValue}
                                    onChange={handleChange}
                                    placeholder="5000"
                                    className="w-full pl-10 px-4 py-3 text-lg font-bold border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    required
                                    autoFocus={!!initialData}
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button type="submit" className="flex-1 bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors">
                            {initialData ? t('save_changes') : t('add_asset')}
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

const AssetGroup = ({ typeId, assets, onEdit, onRemove }) => {
    const { t } = useTranslation();
    const typeDef = ASSET_TYPES.find(t => t.id === typeId);
    if (!typeDef || assets.length === 0) return null;

    const totalValue = assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const Icon = typeDef.icon;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${typeDef.color}-100 dark:bg-${typeDef.color}-900/30 text-${typeDef.color}-600 dark:text-${typeDef.color}-400`}>
                        <Icon size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{t(typeDef.translationKey)}</h3>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{totalValue.toLocaleString()}€</span>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
                {assets.map(asset => (
                    <div key={asset.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-900 dark:text-white">{asset.name}</p>
                                {asset.ticker && <span className="text-xs font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded uppercase">{asset.ticker}</span>}
                            </div>
                            {asset.isQuantified && (
                                <div>
                                    <p className="text-xs text-slate-400">
                                        {asset.quantity} x {Number(asset.unitPrice || 0).toLocaleString()}€
                                    </p>
                                    {asset.originalCurrency && asset.originalCurrency !== 'EUR' && (
                                        <p className="text-[10px] text-slate-400 italic">
                                            ({Number(asset.originalUnitPrice).toFixed(2)} {asset.originalCurrency})
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{Number(asset.value || 0).toLocaleString()}€</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(asset)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 dark:hover:text-white dark:hover:bg-slate-600 rounded-lg"><Edit2 size={16} /></button>
                                <button onClick={() => onRemove(asset.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AssetManager = ({ assets, onAddAsset, onRemoveAsset, onUpdateAsset }) => {
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleSave = (data) => {
        if (editingAsset) {
            onUpdateAsset(editingAsset.id, data);
            setEditingAsset(null);
        } else {
            onAddAsset({ ...data, id: Date.now().toString() });
            setIsAdding(false);
        }
    };

    const refreshPrices = async () => {
        setIsRefreshing(true);
        let updatedCount = 0;

        // Process sequentially to avoid rate limits if any
        for (const asset of (assets || [])) {
            if (asset.ticker && asset.isQuantified) {
                try {
                    const data = await priceService.getPrice(asset.ticker);
                    if (data) {
                        let finalPrice = data.price;
                        let rate = 1;

                        if (data.currency && data.currency !== 'EUR') {
                            rate = await priceService.getExchangeRate(data.currency, 'EUR');
                            finalPrice = data.price * rate;
                        }

                        const newValue = (Number(asset.quantity) || 0) * finalPrice;
                        onUpdateAsset(asset.id, {
                            ...asset,
                            unitPrice: finalPrice,
                            value: newValue,
                            originalCurrency: data.currency,
                            originalUnitPrice: data.price,
                            exchangeRate: rate
                        });
                        updatedCount++;
                    }
                } catch (e) {
                    console.error("Failed to refresh price for", asset.ticker, e);
                }
            }
        }

        setIsRefreshing(false);
    };

    const totalAssets = (assets || []).reduce((sum, a) => sum + (Number(a.value) || 0), 0);

    // Group assets by type
    const groupedAssets = ASSET_TYPES.map(type => ({
        typeId: type.id,
        items: (assets || []).filter(a => a.type === type.id)
    })).filter(group => group.items.length > 0);

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in">

            {/* Summary Header */}
            <div className="bg-slate-900 dark:bg-indigo-600 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-slate-400 dark:text-indigo-200 font-medium mb-2">{t('total_assets')}</p>
                    <h2 className="text-5xl font-bold mb-4">{Math.round(totalAssets).toLocaleString()}€</h2>
                    <div className="flex items-center gap-2 text-slate-300 dark:text-indigo-100">
                        <TrendingUp size={20} />
                        <span>{t('your_wealth')}</span>
                    </div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
                    <Wallet size={200} />
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t('your_portfolio')}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={refreshPrices}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
                    >
                        <span className={isRefreshing ? "animate-spin" : ""}>↻</span>
                        {isRefreshing ? t('updating') : t('update_prices')}
                    </button>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-slate-900/20 dark:shadow-indigo-900/20"
                    >
                        <Plus size={20} /> {t('add_asset')}
                    </button>
                </div>
            </div>

            {/* Asset List */}
            <div className="space-y-6">
                {(assets || []).length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-700 rounded-3xl border border-dashed border-slate-200 dark:border-slate-600">
                        <p className="text-slate-400 font-medium">{t('no_assets_added')}</p>
                        <button onClick={() => setIsAdding(true)} className="mt-4 text-emerald-600 dark:text-emerald-400 font-bold hover:underline">{t('add_first_asset')}</button>
                    </div>
                ) : (
                    groupedAssets.map(group => (
                        <AssetGroup
                            key={group.typeId}
                            typeId={group.typeId}
                            assets={group.items}
                            onEdit={setEditingAsset}
                            onRemove={onRemoveAsset}
                        />
                    ))
                )}
            </div>

            {/* Modals */}
            {(isAdding || editingAsset) && (
                <AssetForm
                    initialData={editingAsset}
                    onSubmit={handleSave}
                    onCancel={() => { setIsAdding(false); setEditingAsset(null); }}
                />
            )}

        </div>
    );
};

export default AssetManager;
