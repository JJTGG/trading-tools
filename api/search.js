export default async function handler(request, response) {
    const query = request.query.query?.trim();

    if (!query) {
        return response.status(400).json({
            error: "Search query is required"
        });
    }

    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
        return response.status(500).json({
            error: "Market data is not configured"
        });
    }

    const url = new URL("https://api.twelvedata.com/symbol_search");

    url.searchParams.set("symbol", query);
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
                error: data.message || "Unable to search markets"
            });
        }

        return response.status(200).json({
            results: data.data || []
        });
    } catch {
        return response.status(500).json({
            error: "Unable to search markets"
        });
    }
}