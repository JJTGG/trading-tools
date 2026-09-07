export default async function handler(request, response) {
    const symbol = request.query.symbol?.trim();
    const interval = request.query.interval?.trim() || "1day";

    const allowedIntervals = [
        "1min",
        "5min",
        "15min",
        "30min",
        "45min",
        "1h",
        "2h",
        "4h",
        "8h",
        "1day",
        "1week",
        "1month"
    ];

    if (!symbol) {
        return response.status(400).json({
            error: "Symbol is required"
        });
    }

    if (!allowedIntervals.includes(interval)) {
        return response.status(400).json({
            error: "Invalid interval"
        });
    }

    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
        return response.status(500).json({
            error: "Market data is not configured"
        });
    }

    const url = new URL("https://api.twelvedata.com/time_series");

    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", "30");
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
                error: data.message || "Unable to retrieve market history"
            });
        }

        return response.status(200).json({
            symbol: data.meta?.symbol,
            interval: data.meta?.interval,
            currency: data.meta?.currency,
            exchange: data.meta?.exchange,
            values: (data.values || []).map((item) => ({
                datetime: item.datetime,
                open: Number(item.open),
                high: Number(item.high),
                low: Number(item.low),
                close: Number(item.close),
                volume: item.volume !== undefined
                    ? Number(item.volume)
                    : null
            }))
        });
    } catch {
        return response.status(500).json({
            error: "Unable to retrieve market history"
        });
    }
}