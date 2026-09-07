export default async function handler(request, response) {
    const from = request.query.from?.trim().toUpperCase();
    const to = request.query.to?.trim().toUpperCase();
    const amount = Number(request.query.amount);

    if (!from || !to) {
        return response.status(400).json({
            error: "Source and target currencies are required"
        });
    }

    if (!Number.isFinite(amount) || amount < 0) {
        return response.status(400).json({
            error: "Amount must be a valid non-negative number"
        });
    }

    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
        return response.status(500).json({
            error: "Market data is not configured"
        });
    }

    const url = new URL(
        "https://api.twelvedata.com/currency_conversion"
    );

    url.searchParams.set("symbol", `${from}/${to}`);
    url.searchParams.set("amount", amount);
    url.searchParams.set("apikey", apiKey);

    try {
        const result = await fetch(url);

        if (!result.ok) {
            return response.status(502).json({
                error: "Currency data provider unavailable"
            });
        }

        const data = await result.json();

        if (data.status === "error") {
            return response.status(400).json({
                error:
                    data.message ||
                    "Unable to convert currency"
            });
        }

        return response.status(200).json({
            from,
            to,
            amount,
            rate: Number(data.rate),
            convertedAmount: Number(data.amount)
        });
    } catch {
        return response.status(500).json({
            error: "Unable to retrieve currency conversion"
        });
    }
}