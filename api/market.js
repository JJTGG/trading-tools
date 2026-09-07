export default async function handler(request, response) {
    const symbol = request.query.symbol?.trim();

    if (!symbol) {
        return response.status(400).json({
            error: "Symbol is required"
        });
    }

    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
        return response.status(500).json({
            error: "Market data is not configured"
        });
    }

    const url = new URL("https://api.twelvedata.com/quote");

    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", apiKey);

    try {
        const result = await fetch(url);

        if (!result.ok) {
            return response.status(502).json({
                error: "Market data provider unavailable"
            });
        }

        const data = await result.json();

        if (data.status === "error") {
            return response.status(400).json({
                error: data.message || "Unable to retrieve market data"
            });
        }

        return response.status(200).json({
            symbol: data.symbol,
            name: data.name,
            exchange: data.exchange,
            currency: data.currency,

            price: Number(data.close),
            change: Number(data.change),
            changePercent: Number(data.percent_change),

            open: Number(data.open),
            high: Number(data.high),
            low: Number(data.low),
            previousClose: Number(data.previous_close),
            volume: Number(data.volume),

            marketOpen: Boolean(data.is_market_open)
        });
    } catch {
        return response.status(500).json({
            error: "Unable to retrieve market data"
        });
    }
}