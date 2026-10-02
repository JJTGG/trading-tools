export interface MarketQuote {
    symbol: string;
    name: string;
    exchange: string;
    currency: string;
    price: number;
    change: number;
    changePercent: number;
    marketOpen: boolean;
}

export async function getMarketQuote(
    symbol: string
): Promise<MarketQuote> {
    const response = await fetch(
        `/api/market?symbol=${encodeURIComponent(symbol)}`
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || "Unable to load market data"
        );
    }

    return {
        symbol: String(data.symbol),
        name: String(data.name),
        exchange: String(data.exchange),
        currency: String(data.currency),
        price: Number(data.price),
        change: Number(data.change),
        changePercent: Number(data.changePercent),
        marketOpen: Boolean(data.marketOpen)
    };
}