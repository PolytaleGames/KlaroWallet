import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Plus, Trash2, Edit2, TrendingUp, Euro, Wallet, Briefcase, Landmark, Coins, Home, X, Eye, Search, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { priceService } from '../services/priceService';
import AssetChart from './AssetChart';

const calculatePerformance = (asset) => {
    if (!asset.isQuantified || !asset.costPrice || Number(asset.costPrice) === 0) return null;

    const quantity = Number(asset.quantity) || 0;
    const currentPrice = Number(asset.unitPrice) || 0;
    const costPrice = Number(asset.costPrice) || 0;

    // Total Value = Qty * Current
    // Total Cost = Qty * Cost
    const totalCurrentValue = quantity * currentPrice;
    const totalCost = quantity * costPrice;

    const diff = totalCurrentValue - totalCost;
    const percent = totalCost !== 0 ? (diff / totalCost) * 100 : 0;

    return { diff, percent };
};

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

const AssetForm = ({ initialData, onSubmit, onCancel, onTickerSelect }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState(initialData || {
        name: '',
        ticker: '',
        type: 'stock',
        isQuantified: false,
        quantity: '',
        unitPrice: '',
        totalValue: '',
        costPrice: '',
        currency: 'EUR',
        originalCurrency: 'EUR'
    });

    const [searchQuery, setSearchQuery] = useState(initialData?.ticker || '');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);

    const ignoreSearchRef = useRef(false);

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
        ignoreSearchRef.current = true;
        setShowResults(false);
        setSearchQuery(asset.symbol);

        // Auto-configure form
        setFormData(prev => ({
            ...prev,
            name: asset.name,
            ticker: asset.symbol,
            type: asset.type === 'CRYPTOCURRENCY' ? 'crypto' : 'stock',
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
                    exchangeRate: rate,
                    changePercent: data.changePercent // Store this to pass it on save
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

                    {/* 1. Name Input - Moved to TOP */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('asset_name')}</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Livret A, Bitcoin..."
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:text-white transition-all shadow-sm font-medium"
                            required
                        />
                    </div>

                    {/* 2. Type Selection - Under Name */}
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
                                                ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600 dark:text-white shadow-md transform scale-[1.02]"
                                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        <Icon size={20} className="mb-1" />
                                        <span className="text-xs font-medium">{t(type.translationKey)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* 3. Search & Ticker - Side by Side */}
                    {!initialData && (
                        <div className="grid grid-cols-2 gap-4">
                            {/* Search */}
                            <div className="relative z-20">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('search_asset')}</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                        <Search size={18} />
                                    </div>
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (ignoreSearchRef.current) ignoreSearchRef.current = false;
                                        }}
                                        placeholder="Apple, BTC..."
                                        className="w-full pl-10 px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:text-white transition-all shadow-sm"
                                    />
                                    {isFetchingPrice && <span className="absolute right-3 top-2.5 text-slate-400 animate-spin">↻</span>}
                                </div>
                                {/* Search Results */}
                                {showResults && searchResults.length > 0 && !ignoreSearchRef.current && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700 z-50 animate-in fade-in slide-in-from-top-2">
                                        {searchResults.map((result) => (
                                            <button
                                                key={result.symbol}
                                                type="button"
                                                onClick={() => handleSelectAsset(result)}
                                                className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex justify-between items-center group"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{result.symbol}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.name}</p>
                                                </div>
                                                <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 rounded group-hover:bg-white dark:group-hover:bg-slate-500 transition-colors whitespace-nowrap">{result.exchange}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Ticker Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('ticker_optional')}</label>
                                <input
                                    name="ticker"
                                    value={formData.ticker}
                                    onChange={handleChange}
                                    placeholder="AAPL"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none uppercase dark:text-white transition-all shadow-sm font-medium"
                                />
                            </div>
                        </div>
                    )}

                    {/* Quantified Toggle */}
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

                    {/* Values Section */}
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
                                    className="w-full px-4 py-3 text-lg font-bold bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:text-white transition-all shadow-sm"
                                    required
                                    autoFocus={!!initialData}
                                />
                            </div>

                            {/* Unit Price */}
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
                                        "w-full px-4 py-3 text-lg font-bold border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none transition-all shadow-sm",
                                        formData.ticker
                                            ? "bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed border-transparent"
                                            : "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 dark:text-white"
                                    )}
                                    required
                                />
                                {isFetchingPrice && <span className="absolute right-3 top-9 text-slate-400 animate-spin">↻</span>}
                            </div>

                            {/* Cost Price - NEW */}
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('cost_price')}</label>
                                <input
                                    name="costPrice"
                                    type="number"
                                    step="any"
                                    value={formData.costPrice}
                                    onChange={handleChange}
                                    placeholder="Optional"
                                    className="w-full px-4 py-3 text-lg font-bold bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:text-white transition-all shadow-sm"
                                />
                            </div>

                            {/* Conversion Info */}
                            {formData.originalCurrency && formData.originalCurrency !== 'EUR' && (
                                <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800">
                                    {t('converted_from')} {Number(formData.originalUnitPrice).toFixed(2)} {formData.originalCurrency}
                                    (Rate: {Number(formData.exchangeRate).toFixed(4)})
                                </div>
                            )}

                            {/* Total Calculated */}
                            <div className="col-span-2 bg-slate-50 dark:bg-slate-700 p-3 rounded-xl flex items-center justify-between">
                                <span className="text-sm text-slate-500 dark:text-slate-400">{t('calculated_total')}</span>
                                <span className="font-bold text-slate-900 dark:text-white text-lg">
                                    {((Number(formData.quantity) || 0) * (Number(formData.unitPrice) || 0)).toLocaleString(undefined, { maximumFractionDigits: 1 })}€
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('total_value')}</label>
                            <div className="relative">
                                <input
                                    name="totalValue"
                                    type="number"
                                    step="any"
                                    value={formData.totalValue}
                                    onChange={handleChange}
                                    placeholder="1000"
                                    className="w-full px-4 py-3 text-lg font-bold border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    required
                                    autoFocus
                                />
                                <span className="absolute right-4 top-4 text-slate-400 font-bold">€</span>
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                        >
                            {initialData ? t('save_changes') : t('add_asset')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

const AssetGroup = ({ typeId, assets, activeVariations, onEdit, onRemove, onViewChart, totalPortfolioValue }) => {
    const { t } = useTranslation();
    const type = ASSET_TYPES.find(t => t.id === typeId);
    const Icon = type.icon;
    const categoryValue = assets.reduce((sum, asset) => sum + (Number(asset.value) || 0), 0);
    const categoryWeight = totalPortfolioValue > 0 ? (categoryValue / totalPortfolioValue) * 100 : 0;

    // Calculate Group Performance
    const groupPerformance = assets.reduce((acc, asset) => {
        const perf = calculatePerformance(asset);
        if (perf) {
            acc.totalDiff += perf.diff;
            acc.hasData = true;
        }
        return acc;
    }, { totalDiff: 0, hasData: false });

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Category Header - Minimalist */}
            <div className={`px-8 py-5 flex items-center justify-between bg-white dark:bg-slate-800 border-b border-slate-50 dark:border-slate-700/50`}>
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform hover:scale-105",
                        `bg-${type.color}-50 text-${type.color}-600 dark:bg-${type.color}-900/20 dark:text-${type.color}-400`
                    )}>
                        <Icon size={22} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h4 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight leading-tight">{t(type.translationKey)}</h4>
                        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{assets.length} {assets.length > 1 ? t('assets') : t('asset')}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-bold text-2xl text-slate-900 dark:text-white tabular-nums tracking-tight">{categoryValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}€</div>
                    <div className="flex items-center justify-end gap-2 text-xs mt-1">
                        {groupPerformance.hasData && (
                            <span className={cn(
                                "font-bold tabular-nums px-2.5 py-1 rounded-full text-[11px]",
                                groupPerformance.totalDiff >= 0
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                            )}>
                                {groupPerformance.totalDiff > 0 ? "+" : ""}{groupPerformance.totalDiff.toLocaleString(undefined, { maximumFractionDigits: 1 })}€
                            </span>
                        )}
                        <span className="font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                            {categoryWeight.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Table Headers - Subtle & Spaced */}
            <div className="hidden md:grid grid-cols-12 gap-6 px-8 py-3 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-50 dark:border-slate-700/50 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">
                <div className="col-span-4 pl-2">{t('asset_name')}</div>
                <div className="col-span-3 text-right">{t('price')}</div>
                <div className="col-span-2 text-right">{t('performance')}</div>
                <div className="col-span-3 text-right">{t('value')}</div>
            </div>

            {/* Asset List */}
            <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {assets.map(asset => {
                    const assetValue = Number(asset.value) || 0;
                    const assetWeight = totalPortfolioValue > 0 ? (assetValue / totalPortfolioValue) * 100 : 0;
                    const performance = calculatePerformance(asset);

                    return (
                        <div key={asset.id} className="group relative p-6 md:px-8 md:py-5 transition-all duration-200 hover:bg-slate-50/80 dark:hover:bg-slate-700/20">
                            {/* Desktop Layout - Fluid & Clean */}
                            <div className="hidden md:grid grid-cols-12 gap-6 items-center">
                                {/* 1. Asset Info (Col 5) */}
                                <div className="col-span-4 flex items-center gap-4 min-w-0">
                                    <div className="min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center gap-2">
                                            <h5 className="font-bold text-slate-900 dark:text-white truncate text-base">{asset.name}</h5>
                                            {asset.ticker && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md uppercase tracking-wider shrink-0 border border-slate-200 dark:border-slate-600">
                                                    {asset.ticker}
                                                </span>
                                            )}
                                        </div>
                                        {/* Daily Variation Display */}
                                        <div className="flex items-center gap-2 mt-0.5 min-h-[1.25rem]">
                                            {activeVariations[asset.id] !== undefined ? (
                                                <span className={cn(
                                                    "text-xs font-bold tabular-nums flex items-center gap-1",
                                                    activeVariations[asset.id] >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                                )}>
                                                    {activeVariations[asset.id] > 0 ? "↑" : "↓"} {Math.abs(activeVariations[asset.id]).toFixed(2)}% <span className="text-slate-300 dark:text-slate-600 font-normal">24h</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 dark:text-slate-600">-</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Price / Quantity (Col 3) */}
                                <div className="col-span-3 text-right flex flex-col items-end justify-center">
                                    {asset.isQuantified ? (
                                        <>
                                            <div className="text-base font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                                                {Number(asset.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}€
                                            </div>
                                            <div className="text-xs text-slate-400 dark:text-slate-500 tabular-nums font-medium mt-0.5">
                                                {Number(asset.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 })} {t('units')}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-1 w-4 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                                    )}
                                </div>

                                {/* 3. Performance (Col 2) - PILLS */}
                                <div className="col-span-2 flex justify-end">
                                    {performance ? (
                                        <div className={cn(
                                            "flex flex-col items-end px-3 py-1.5 rounded-xl border transition-colors",
                                            performance.diff >= 0
                                                ? "bg-emerald-50/50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-500/20 dark:text-emerald-400"
                                                : "bg-rose-50/50 border-rose-100 text-rose-700 dark:bg-rose-900/10 dark:border-rose-500/20 dark:text-rose-400"
                                        )}>
                                            <div className="text-xs font-bold tabular-nums">
                                                {performance.diff > 0 ? "+" : ""}{performance.diff.toLocaleString(undefined, { maximumFractionDigits: 0 })}€
                                            </div>
                                            <div className="text-[10px] font-bold opacity-80 tabular-nums">
                                                {performance.percent > 0 ? "+" : ""}{performance.percent.toFixed(1)}%
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-1 w-4 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                                    )}
                                </div>

                                {/* 4. Value / Actions (Col 2) */}
                                <div className="col-span-3 relative h-12 flex items-center justify-end">
                                    {/* Default View: Value */}
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 transition-all duration-200 group-hover:opacity-0 group-hover:translate-x-4">
                                        <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums tracking-tight text-right">
                                            {assetValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}€
                                        </div>
                                        <div className="text-xs font-medium text-slate-400 dark:text-slate-500 tabular-nums text-right">
                                            {assetWeight.toFixed(1)}%
                                        </div>
                                    </div>

                                    {/* Hover View: Actions */}
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out z-10">
                                        {asset.ticker && (
                                            <button onClick={() => onViewChart(asset)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-600/50 border border-transparent hover:border-indigo-100 dark:hover:border-slate-500 rounded-lg transition-all transform hover:scale-105" title="View Chart">
                                                <Eye size={18} />
                                            </button>
                                        )}
                                        <button onClick={() => onEdit(asset)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-600/50 border border-transparent hover:border-indigo-100 dark:hover:border-slate-500 rounded-lg transition-all transform hover:scale-105">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => onRemove(asset.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-600/50 border border-transparent hover:border-red-100 dark:hover:border-slate-500 rounded-lg transition-all transform hover:scale-105">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Layout (Card Style) */}
                            <div className="flex md:hidden items-center justify-between">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h5 className="font-bold text-slate-900 dark:text-white truncate text-base">{asset.name}</h5>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                        {asset.ticker && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded uppercase">{asset.ticker}</span>}
                                        {performance ? (
                                            <span className={cn(
                                                "font-bold text-[10px] px-1.5 py-0.5 rounded",
                                                performance.diff >= 0 ? "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-rose-100/50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                                            )}>
                                                {performance.diff > 0 ? "+" : ""}{performance.percent.toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span className="text-xs">{Number(asset.quantity || 0).toLocaleString()} {t('units')}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-base font-bold text-slate-900 dark:text-white">
                                        {assetValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}€
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => onEdit(asset)} className="p-1.5 text-slate-400 bg-slate-50 rounded-lg">
                                            <Edit2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AssetManager = ({ assets, onAddAsset, onRemoveAsset, onUpdateAsset }) => {
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);
    const [viewingAsset, setViewingAsset] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [activeVariations, setActiveVariations] = useState({});

    useEffect(() => {
        refreshPrices();
    }, []);

    const handleSave = (data) => {
        if (editingAsset) {
            onUpdateAsset(editingAsset.id, data);
            setEditingAsset(null);
        } else {
            const newId = Date.now().toString();

            // Extract and use the changePercent we captured during asset selection
            const { changePercent, ...assetData } = data;

            if (changePercent !== undefined) {
                setActiveVariations(prev => ({ ...prev, [newId]: changePercent }));
            }

            onAddAsset({ ...assetData, id: newId });
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

                        // Update variations locally
                        if (data.changePercent !== undefined) {
                            setActiveVariations(prev => ({ ...prev, [asset.id]: data.changePercent }));
                        }

                        // Persist price, remove changePercent from persistence if present
                        const { changePercent, ...cleanAsset } = asset;
                        onUpdateAsset(asset.id, {
                            ...cleanAsset,
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

        await new Promise(r => setTimeout(r, 600)); // Minimum delight time
        setIsRefreshing(false);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 2000); // Reset after 2s
    };

    const totalAssets = (assets || []).reduce((sum, a) => sum + (Number(a.value) || 0), 0);

    // Calculate Global Performance across ALL assets
    // User wants "Total Wealth" variation, so assets without P&L (like Cash) are treated as Cost = Value (0% variation)
    const globalPerformance = (assets || []).reduce((acc, asset) => {
        const perf = calculatePerformance(asset);

        if (perf) {
            // Asset with variation (Stocks, Crypto...)
            acc.totalDiff += perf.diff;
            acc.totalCost += (Number(asset.quantity) * Number(asset.costPrice));
        } else {
            // Asset without variation (Cash, etc.) -> Cost is Current Value
            // This ensures the % is calculated against the TOTAL wealth
            acc.totalCost += (Number(asset.value) || 0);
        }

        // We consider we have data if at least ONE asset generates a diff
        if (perf) acc.hasData = true;

        return acc;
    }, { totalDiff: 0, totalCost: 0, hasData: false });

    const globalPercent = globalPerformance.totalCost > 0
        ? (globalPerformance.totalDiff / globalPerformance.totalCost) * 100
        : 0;

    // Group assets by type
    const groupedAssets = ASSET_TYPES.map(type => ({
        typeId: type.id,
        items: (assets || []).filter(a => a.type === type.id)
    })).filter(group => group.items.length > 0);

    return (
        <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in">

            {/* Summary Header */}
            <div className="bg-slate-900 dark:bg-indigo-600 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <p className="text-slate-400 dark:text-indigo-200 font-medium mb-2">{t('total_assets')}</p>
                        <h2 className="text-5xl font-bold mb-4 tabular-nums">{totalAssets.toLocaleString(undefined, { maximumFractionDigits: 1 })}€</h2>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-slate-300 dark:text-indigo-100">
                                <TrendingUp size={20} />
                                <span>{t('your_wealth')}</span>
                            </div>
                            {globalPerformance.hasData && (
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1",
                                        globalPerformance.totalDiff >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                                    )}>
                                        {globalPerformance.totalDiff > 0 ? "+" : ""}{globalPerformance.totalDiff.toLocaleString(undefined, { maximumFractionDigits: 1 })}€
                                        <span className="opacity-70 mx-1">|</span>
                                        {globalPerformance.totalDiff > 0 ? "+" : ""}{globalPercent.toFixed(1)}%
                                    </span>
                                </div>
                            )}
                        </div>
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
                        disabled={isRefreshing || isSuccess}
                        className={`
                            relative group overflow-hidden w-40 h-10 flex items-center justify-center rounded-xl font-bold text-sm transition-all duration-300
                            ${isSuccess
                                ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                                : isRefreshing
                                    ? 'bg-slate-900 border-slate-700 text-indigo-400 cursor-wait'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                            }
                        `}
                    >
                        {/* Gradient Scan Effect (Idle) */}
                        {!isRefreshing && !isSuccess && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        )}

                        {/* Content Container */}
                        <div className="relative flex items-center gap-2">
                            {isRefreshing ? (
                                <>
                                    <div className="relative">
                                        <div className="absolute inset-0 animate-ping opacity-30 bg-indigo-500 rounded-full" />
                                        <RefreshCw size={16} className="animate-spin text-indigo-500" />
                                    </div>
                                    <span className="text-slate-400 animate-pulse">
                                        Scanning...
                                    </span>
                                </>
                            ) : isSuccess ? (
                                <>
                                    <ShieldCheck size={18} className="animate-in zoom-in spin-in-90 duration-300" />
                                    <span>Updated!</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={16} className={`transition-transform duration-300 ${isRefreshing ? 'rotate-180' : 'group-hover:scale-110'}`} />
                                    <span>{t('update_prices')}</span>
                                </>
                            )}
                        </div>
                    </button>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-slate-900/20 dark:shadow-indigo-900/20"
                    >
                        <Plus size={20} /> {t('add_asset')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Charts & Summary */}
                <div className="space-y-6">


                    {/* Asset Allocation Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-6">{t('allocation')}</h3>
                        <div className="space-y-4">
                            {groupedAssets.map(group => {
                                const type = ASSET_TYPES.find(t => t.id === group.typeId);
                                const value = group.items.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
                                const percentage = totalAssets > 0 ? (value / totalAssets) * 100 : 0;

                                // Safe color mapping for Tailwind
                                const colorMap = {
                                    emerald: 'bg-emerald-500',
                                    blue: 'bg-blue-500',
                                    violet: 'bg-violet-500',
                                    amber: 'bg-amber-500',
                                    rose: 'bg-rose-500',
                                    slate: 'bg-slate-500'
                                };

                                return (
                                    <div key={group.typeId}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-600 dark:text-slate-300">{t(type.translationKey)}</span>
                                            <span className="font-medium text-slate-900 dark:text-white">{percentage.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${colorMap[type.color] || 'bg-slate-500'} transition-all duration-500`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column - Asset List */}
                <div className="lg:col-span-2">
                    {groupedAssets.map(group => (
                        <AssetGroup
                            key={group.typeId}
                            typeId={group.typeId}
                            assets={group.items}
                            activeVariations={activeVariations}
                            onEdit={setEditingAsset}
                            onRemove={onRemoveAsset}
                            onViewChart={setViewingAsset}
                            totalPortfolioValue={totalAssets}
                        />
                    ))}

                    {assets.length === 0 && (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Plus size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('no_assets_added')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">{t('add_first_asset')}</p>
                            <button onClick={() => { setEditingAsset(null); setIsAdding(true); }} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors">
                                {t('add_asset')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {/* Modals */}
            {(isAdding || editingAsset) && (
                <AssetForm
                    initialData={editingAsset}
                    onSubmit={handleSave}
                    onCancel={() => { setIsAdding(false); setEditingAsset(null); }}
                />
            )}

            {viewingAsset && (
                <AssetChart
                    asset={viewingAsset}
                    onClose={() => setViewingAsset(null)}
                />
            )}

        </div>
    );
};

export default AssetManager;
