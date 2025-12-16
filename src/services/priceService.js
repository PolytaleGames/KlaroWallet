// Simple service to fetch prices from Yahoo Finance's unofficial public API
// Note: This is for personal use/demo purposes. For production, use a paid API.

export const priceService = {
    async getPrice(ticker) {
        if (!ticker) return null;

        try {
            // Using a CORS proxy might be needed in a web browser, but in Tauri (Rust backend) 
            // or some dev environments it might work directly or via a simple fetch if CORS allows.
            // For this local-first app, we'll try a direct fetch. If CORS blocks it in the browser,
            // we might need a different approach (like a serverless function or Tauri command).
            // However, Yahoo's chart API is often more permissive or we can use a public proxy.

            // We'll use a public CORS proxy for the web version to ensure it works.
            // In a real Tauri app, we should use the Tauri HTTP client to bypass CORS.
            // For now, let's try a standard fetch with a CORS proxy fallback.

            const symbol = ticker.toUpperCase();
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

            // Note: Direct fetch often fails due to CORS in browsers.
            // We'll use 'corsproxy.io' as a temporary solution for this demo.
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            const result = data.chart.result[0];

            if (!result || !result.meta || !result.meta.regularMarketPrice) {
                throw new Error('Invalid data format');
            }

            return {
                price: result.meta.regularMarketPrice,
                currency: result.meta.currency || 'EUR'
            };
        } catch (error) {
            console.error(`Failed to fetch price for ${ticker}:`, error);
            return null;
        }
    },

    async getExchangeRate(from, to) {
        if (from === to) return 1;
        try {
            const symbol = `${from}${to}=X`;
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            const result = data.chart.result[0];

            if (!result || !result.meta || !result.meta.regularMarketPrice) {
                return 1; // Fallback
            }

            return result.meta.regularMarketPrice;
        } catch (error) {
            console.error(`Failed to fetch exchange rate for ${from}/${to}:`, error);
            return 1; // Fallback to 1:1 on error to prevent crash
        }
    },

    async search(query) {
        if (!query || query.length < 2) return [];

        try {
            const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            if (!data.quotes) return [];

            return data.quotes
                .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'CRYPTOCURRENCY' || q.quoteType === 'FUTURE')
                .map(q => ({
                    symbol: q.symbol,
                    name: q.shortname || q.longname || q.symbol,
                    type: q.quoteType,
                    exchange: q.exchange
                }));
        } catch (error) {
            console.error(`Failed to search for ${query}:`, error);
            return [];
        }
    }
};
