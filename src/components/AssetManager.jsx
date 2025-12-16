import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, TrendingUp, DollarSign, Wallet, Briefcase, Landmark, Coins, Home, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { priceService } from '../services/priceService';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const ASSET_TYPES = [
    { id: 'cash', name: 'Cash & Savings', icon: Wallet, color: 'emerald' },
    { id: 'stock', name: 'Stocks & Funds', icon: TrendingUp, color: 'blue' },
    { id: 'crypto', name: 'Crypto', icon: Coins, color: 'violet' },
    { id: 'metal', name: 'Precious Metals', icon: Landmark, color: 'amber' },
    { id: 'real_estate', name: 'Real Estate', icon: Home, color: 'rose' },
    { id: 'other', name: 'Other Assets', icon: Briefcase, color: 'slate' },
];

const AssetForm = ({ initialData, onSubmit, onCancel }) => {
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">{initialData ? 'Edit Asset' : 'Add New Asset'}</h3>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Search / Ticker Input - ONLY FOR NEW ASSETS */}
                    {!initialData && (
                        <div className="relative z-20">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Search Asset (Stock, ETF, Crypto)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400">🔍</span>
                                <input
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                                    placeholder="e.g. Total, Bitcoin, Apple"
                                    className="w-full pl-10 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                    autoFocus
                                />
                                {isSearching && <span className="absolute right-3 top-3 text-slate-400 animate-spin">↻</span>}
                            </div>

                            {/* Search Results Dropdown */}
                            {showResults && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-50">
                                    {searchResults.map((result) => (
                                        <button
                                            key={result.symbol}
                                            type="button"
                                            onClick={() => handleSelectAsset(result)}
                                            className="w-full p-3 text-left hover:bg-slate-50 transition-colors flex justify-between items-center group"
                                        >
                                            <div>
                                                <p className="font-bold text-slate-900">{result.symbol}</p>
                                                <p className="text-sm text-slate-500 truncate max-w-[200px]">{result.name}</p>
                                            </div>
                                            <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded group-hover:bg-white">{result.exchange}</span>
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
                                                ? `bg-${type.color}-50 border-${type.color}-500 text-${type.color}-700 ring-1 ring-${type.color}-500`
                                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <Icon size={20} className="mb-1" />
                                        <span className="text-xs font-medium">{type.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Name & Ticker - ONLY FOR NEW ASSETS */}
                    {!initialData && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Livret A"
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ticker (Optional)</label>
                                <div className="relative">
                                    <input
                                        name="ticker"
                                        value={formData.ticker}
                                        onChange={handleChange}
                                        placeholder="e.g. TTE.PA, BTC-USD"
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none uppercase"
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
                            <label htmlFor="isQuantified" className="text-sm text-slate-700 select-none cursor-pointer">
                                Track by Quantity {formData.ticker && <span className="text-slate-400">(Required for Ticker assets)</span>}
                            </label>
                        </div>
                    )}

                    {/* EDIT MODE HEADER */}
                    {initialData && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                            <p className="text-sm text-slate-500 mb-1">Editing</p>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-slate-900">{formData.name}</span>
                                {formData.ticker && <span className="text-xs font-bold px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded uppercase">{formData.ticker}</span>}
                            </div>
                        </div>
                    )}

                    {formData.isQuantified ? (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                                <input
                                    name="quantity"
                                    type="number"
                                    step="any"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    placeholder="10"
                                    className="w-full px-4 py-3 text-lg font-bold border rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                    required
                                    autoFocus={!!initialData}
                                />
                            </div>

                            {/* Unit Price - Read Only in Edit Mode usually, but let's keep it visible/editable if no ticker */}
                            <div className="relative col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price (EUR)</label>
                                <input
                                    name="unitPrice"
                                    type="number"
                                    step="any"
                                    value={formData.unitPrice}
                                    onChange={handleChange}
                                    placeholder="60.50"
                                    readOnly={!!formData.ticker}
                                    className={cn(
                                        "w-full px-4 py-3 text-lg font-bold border rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none",
                                        formData.ticker ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
                                    )}
                                    required
                                />
                                {isFetchingPrice && <span className="absolute right-3 top-9 text-slate-400 animate-spin">↻</span>}
                            </div>

                            {formData.originalCurrency && formData.originalCurrency !== 'EUR' && (
                                <div className="col-span-2 text-xs text-slate-500 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                    Converted from {Number(formData.originalUnitPrice).toFixed(2)} {formData.originalCurrency}
                                    (Rate: {Number(formData.exchangeRate).toFixed(4)})
                                </div>
                            )}

                            <div className="col-span-2 md:col-span-1 bg-slate-50 p-3 rounded-xl flex flex-col justify-center">
                                <span className="text-sm text-slate-500">Calculated Total</span>
                                <span className="font-bold text-slate-900 text-lg">
                                    {((Number(formData.quantity) || 0) * (Number(formData.unitPrice) || 0)).toLocaleString()}€
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Total Value (€)</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-4 text-slate-400" />
                                <input
                                    name="totalValue"
                                    type="number"
                                    step="any"
                                    value={formData.totalValue}
                                    onChange={handleChange}
                                    placeholder="5000"
                                    className="w-full pl-10 px-4 py-3 text-lg font-bold border rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                    required
                                    autoFocus={!!initialData}
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button type="submit" className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                            {initialData ? 'Save Changes' : 'Add Asset'}
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

const AssetGroup = ({ typeId, assets, onEdit, onRemove }) => {
    const typeDef = ASSET_TYPES.find(t => t.id === typeId);
    if (!typeDef || assets.length === 0) return null;

    const totalValue = assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const Icon = typeDef.icon;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${typeDef.color}-100 text-${typeDef.color}-600`}>
                        <Icon size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900">{typeDef.name}</h3>
                </div>
                <span className="font-bold text-slate-900">{totalValue.toLocaleString()}€</span>
            </div>
            <div className="divide-y divide-slate-50">
                {assets.map(asset => (
                    <div key={asset.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-900">{asset.name}</p>
                                {asset.ticker && <span className="text-xs font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">{asset.ticker}</span>}
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
                            <span className="font-bold text-slate-700">{Number(asset.value || 0).toLocaleString()}€</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(asset)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg"><Edit2 size={16} /></button>
                                <button onClick={() => onRemove(asset.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AssetManager = ({ assets, onAddAsset, onRemoveAsset, onUpdateAsset }) => {
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
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-slate-400 font-medium mb-2">Total Assets</p>
                    <h2 className="text-5xl font-bold mb-4">{Math.round(totalAssets).toLocaleString()}€</h2>
                    <div className="flex items-center gap-2 text-slate-300">
                        <TrendingUp size={20} />
                        <span>Your Wealth</span>
                    </div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
                    <Wallet size={200} />
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-900">Your Portfolio</h3>
                <div className="flex gap-2">
                    <button
                        onClick={refreshPrices}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                    >
                        <span className={isRefreshing ? "animate-spin" : ""}>↻</span>
                        {isRefreshing ? 'Updating...' : 'Update Prices'}
                    </button>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-lg shadow-slate-900/20"
                    >
                        <Plus size={20} /> Add Asset
                    </button>
                </div>
            </div>

            {/* Asset List */}
            <div className="space-y-6">
                {(assets || []).length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">No assets added yet.</p>
                        <button onClick={() => setIsAdding(true)} className="mt-4 text-emerald-600 font-bold hover:underline">Add your first asset</button>
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
