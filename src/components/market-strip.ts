import {
    getMarketQuote,
    type MarketQuote
} from "../data/market-data";

const DEFAULT_SYMBOLS = [
    "BTC/USD",
    "ETH/USD",
    "SOL/USD"
];

interface MarketSelectionDetail {
    symbol: string;
    price: number;
}

const strip =
    document.querySelector<HTMLElement>(
        "#market-strip"
    );

const tickerContainer =
    document.querySelector<HTMLElement>(
        "#market-tickers"
    );

const connectionState =
    document.querySelector<HTMLElement>(
        "#market-connection-state"
    );

const formatPrice = (
    value: number
): string => {
    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

const formatChange = (
    value: number
): string => {
    const sign =
        value > 0
            ? "+"
            : "";

    return `${sign}${value.toFixed(2)}%`;
};

const setConnectionState = (
    state: "connecting" | "live" | "error"
): void => {
    if (!connectionState) {
        return;
    }

    if (state === "connecting") {
        connectionState.textContent =
            "Market Data · Connecting";

        connectionState.dataset.state =
            "connecting";

        return;
    }

    if (state === "live") {
        connectionState.textContent =
            `Market Data · Live · ${new Date().toLocaleTimeString(
                undefined,
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            )}`;

        connectionState.dataset.state =
            "live";

        return;
    }

    connectionState.textContent =
        "Market Data · Unavailable";

    connectionState.dataset.state =
        "error";
};

const renderQuote = (
    quote: MarketQuote
): HTMLButtonElement => {
    const button =
        document.createElement("button");

    button.type = "button";
    button.className = "market-ticker";
    button.dataset.symbol = quote.symbol;

    const changeClass =
        quote.changePercent > 0
            ? "positive"
            : quote.changePercent < 0
                ? "negative"
                : "neutral";

    button.innerHTML = `
        <span class="market-ticker-symbol">
            ${quote.symbol}
        </span>

        <strong class="market-ticker-price">
            ${formatPrice(quote.price)}
        </strong>

        <span class="market-ticker-change ${changeClass}">
            ${formatChange(quote.changePercent)}
        </span>
    `;

    button.addEventListener(
        "click",
        () => {
            const detail: MarketSelectionDetail = {
                symbol: quote.symbol,
                price: quote.price
            };

            document.dispatchEvent(
                new CustomEvent(
                    "trading-tools:market-selected",
                    {
                        detail
                    }
                )
            );
        }
    );

    return button;
};

const renderQuotes = (
    quotes: MarketQuote[]
): void => {
    if (!tickerContainer) {
        return;
    }

    tickerContainer.replaceChildren(
        ...quotes.map(renderQuote)
    );
};

const loadMarkets = async (): Promise<void> => {
    setConnectionState("connecting");

    const results =
        await Promise.allSettled(
            DEFAULT_SYMBOLS.map(
                getMarketQuote
            )
        );

    const quotes =
        results
            .filter(
                (
                    result
                ): result is PromiseFulfilledResult<MarketQuote> =>
                    result.status === "fulfilled"
            )
            .map(
                (result) =>
                    result.value
            );

    if (!quotes.length) {
        setConnectionState("error");

        if (tickerContainer) {
            tickerContainer.innerHTML = `
                <span class="market-strip-error">
                    Market data unavailable
                </span>
            `;
        }

        return;
    }

    renderQuotes(quotes);
    setConnectionState("live");
};

export function mountMarketStrip(): void {
    if (!strip || !tickerContainer) {
        return;
    }

    loadMarkets();

    window.setInterval(
        loadMarkets,
        30_000
    );
}