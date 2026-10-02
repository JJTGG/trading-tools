import "../styles/tokens.css";
import "../styles/base.css";
import "./market.css";

import {
    getMarketQuote,
    type MarketQuote
} from "../data/market-data";

interface MarketInstrument {
    symbol: string;
    type: "crypto" | "stock" | "forex";
}

interface MarketSearchResult {
    symbol: string;
    instrument_name?: string;
    exchange?: string;
}

interface MarketHistoryPoint {
    datetime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number | null;
}

interface MarketDetail {
    symbol: string;
    name: string;
    exchange: string;
    currency: string;
    price: number;
    change: number;
    changePercent: number;
    open: number;
    high: number;
    low: number;
    previousClose: number;
    volume: number;
    averageVolume: number;
    fiftyTwoWeek: {
        low: number;
        high: number;
    };
    marketOpen: boolean;
}

interface MarketLibrary {
    createClient(
        url: string,
        key: string
    ): SupabaseClientLike;
}

interface SupabaseUser {
    id: string;
}

interface SupabaseError {
    message: string;
}

interface SupabaseClientLike {
    auth: {
        getUser(): Promise<{
            data: {
                user: SupabaseUser | null;
            };
            error: SupabaseError | null;
        }>;
    };

    from(table: string): {
        select(
            columns?: string
        ): SupabaseQueryLike;
    };
}

interface SupabaseQueryLike {
    eq(
        column: string,
        value: unknown
    ): SupabaseQueryLike;

    order(
        column: string,
        options?: {
            ascending?: boolean;
        }
    ): SupabaseQueryLike;

    then: PromiseLike<unknown>["then"];
}

declare global {
    interface Window {
        supabase?: MarketLibrary;
        supabaseClient?: SupabaseClientLike;
    }
}

const DEFAULT_MARKETS: MarketInstrument[] = [
    {
        symbol: "BTC/USD",
        type: "crypto"
    },
    {
        symbol: "ETH/USD",
        type: "crypto"
    },
    {
        symbol: "SOL/USD",
        type: "crypto"
    },
    {
        symbol: "AAPL",
        type: "stock"
    },
    {
        symbol: "NVDA",
        type: "stock"
    },
    {
        symbol: "EUR/USD",
        type: "forex"
    }
];

const SUPABASE_URL =
    "https://kaierwmqowgpizvwoyet.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_lyrrIdCyXNH2IZt5O5PjQQ_G1l2IBKD";

const marketTableBody =
    document.querySelector<HTMLTableSectionElement>(
        "#market-table-body"
    );

const marketListState =
    document.querySelector<HTMLElement>(
        "#market-list-state"
    );

const searchInput =
    document.querySelector<HTMLInputElement>(
        "#market-search-input"
    );

const suggestions =
    document.querySelector<HTMLElement>(
        "#market-suggestions"
    );

const filters =
    document.querySelectorAll<HTMLButtonElement>(
        ".market-filter"
    );

const detailSymbol =
    document.querySelector<HTMLElement>(
        "#detail-symbol"
    );

const detailName =
    document.querySelector<HTMLElement>(
        "#detail-name"
    );

const detailMeta =
    document.querySelector<HTMLElement>(
        "#detail-meta"
    );

const detailPrice =
    document.querySelector<HTMLElement>(
        "#detail-price"
    );

const detailChange =
    document.querySelector<HTMLElement>(
        "#detail-change"
    );

const detailStatus =
    document.querySelector<HTMLElement>(
        "#detail-status"
    );

const detailOpen =
    document.querySelector<HTMLElement>(
        "#detail-open"
    );

const detailPreviousClose =
    document.querySelector<HTMLElement>(
        "#detail-previous-close"
    );

const detailHigh =
    document.querySelector<HTMLElement>(
        "#detail-high"
    );

const detailLow =
    document.querySelector<HTMLElement>(
        "#detail-low"
    );

const detailVolume =
    document.querySelector<HTMLElement>(
        "#detail-volume"
    );

const detailAverageVolume =
    document.querySelector<HTMLElement>(
        "#detail-average-volume"
    );

const detail52WeekHigh =
    document.querySelector<HTMLElement>(
        "#detail-52w-high"
    );

const detail52WeekLow =
    document.querySelector<HTMLElement>(
        "#detail-52w-low"
    );

const chart =
    document.querySelector<SVGSVGElement>(
        "#market-chart-svg"
    );

const chartTooltip =
    document.querySelector<HTMLElement>(
        "#chart-tooltip"
    );

const chartState =
    document.querySelector<HTMLElement>(
        "#chart-state"
    );

const timeframeButtons =
    document.querySelectorAll<HTMLButtonElement>(
        "#market-timeframes button"
    );

const positionSizeLink =
    document.querySelector<HTMLAnchorElement>(
        "#position-size-link"
    );

const riskRewardLink =
    document.querySelector<HTMLAnchorElement>(
        "#risk-reward-link"
    );

const pnlLink =
    document.querySelector<HTMLAnchorElement>(
        "#pnl-link"
    );

let currentFilter:
    | "all"
    | "crypto"
    | "stock"
    | "forex" = "all";

let selectedSymbol =
    "BTC/USD";

let selectedInstrument:
    MarketInstrument = DEFAULT_MARKETS[0];

let selectedQuote:
    MarketDetail | null = null;

let selectedHistory:
    MarketHistoryPoint[] = [];

let currentInterval =
    "1h";

let searchTimer:
    number | undefined;

const quoteCache =
    new Map<string, MarketDetail>();

const escapeHtml =
    (value: string): string => {
        return value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

const formatPrice =
    (value: number): string => {
        if (!Number.isFinite(value)) {
            return "—";
        }

        return new Intl.NumberFormat(
            undefined,
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(value);
    };

const formatVolume =
    (value: number): string => {
        if (!Number.isFinite(value)) {
            return "—";
        }

        return new Intl.NumberFormat(
            undefined,
            {
                notation: "compact",
                maximumFractionDigits: 2
            }
        ).format(value);
    };

const formatPercent =
    (value: number): string => {
        if (!Number.isFinite(value)) {
            return "—";
        }

        const sign =
            value > 0
                ? "+"
                : "";

        return `${sign}${value.toFixed(2)}%`;
    };

const formatDate =
    (value: string): string => {
        const date =
            new Date(
                `${value}T00:00:00`
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return value;
        }

        return new Intl.DateTimeFormat(
            undefined,
            {
                month: "short",
                day: "numeric"
            }
        ).format(date);
    };

const getSupabaseClient =
    (): SupabaseClientLike | null => {
        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (window.supabase) {
            const client =
                window.supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_PUBLISHABLE_KEY
                );

            window.supabaseClient =
                client;

            return client;
        }

        return null;
    };

const setText =
    (
        element: HTMLElement | null,
        value: string
    ): void => {
        if (element) {
            element.textContent =
                value;
        }
    };

const getInstrumentType =
    (
        symbol: string
    ): MarketInstrument["type"] => {
        if (symbol.includes("/")) {
            if (
                symbol.endsWith("/USD") &&
                !symbol.includes("EUR")
            ) {
                return "crypto";
            }

            return "forex";
        }

        return "stock";
    };

const normalizeDetail =
    (
        data: MarketQuote & {
            open?: number;
            high?: number;
            low?: number;
            previousClose?: number;
            volume?: number;
            averageVolume?: number;
            fiftyTwoWeek?: {
                low?: number;
                high?: number;
            };
        }
    ): MarketDetail => {
        return {
            symbol:
                String(data.symbol),

            name:
                String(data.name),

            exchange:
                String(data.exchange),

            currency:
                String(data.currency),

            price:
                Number(data.price),

            change:
                Number(data.change),

            changePercent:
                Number(data.changePercent),

            open:
                Number(data.open),

            high:
                Number(data.high),

            low:
                Number(data.low),

            previousClose:
                Number(
                    data.previousClose
                ),

            volume:
                Number(data.volume),

            averageVolume:
                Number(
                    data.averageVolume
                ),

            fiftyTwoWeek: {
                low:
                    Number(
                        data.fiftyTwoWeek
                            ?.low
                    ),

                high:
                    Number(
                        data.fiftyTwoWeek
                            ?.high
                    )
            },

            marketOpen:
                Boolean(
                    data.marketOpen
                )
        };
    };

const loadQuote =
    async (
        symbol: string
    ): Promise<MarketDetail> => {
        const cached =
            quoteCache.get(
                symbol
            );

        if (cached) {
            return cached;
        }

        const response =
            await fetch(
                `/api/market?symbol=${encodeURIComponent(
                    symbol
                )}`
            );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                    "Unable to load market data"
            );
        }

        const detail =
            normalizeDetail(data);

        quoteCache.set(
            symbol,
            detail
        );

        return detail;
    };

const loadHistory =
    async (
        symbol: string,
        interval: string
    ): Promise<void> => {
        setText(
            chartState,
            "Loading"
        );

        const response =
            await fetch(
                `/api/time-series?symbol=${encodeURIComponent(
                    symbol
                )}&interval=${encodeURIComponent(
                    interval
                )}`
            );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                    "Unable to load market history"
            );
        }

        selectedHistory =
            Array.isArray(data.values)
                ? data.values
                : [];

        drawCandles(
            selectedHistory
        );

        setText(
            chartState,
            `${selectedHistory.length} bars`
        );
    };

const renderTable =
    (
        rows: Array<{
            instrument: MarketInstrument;
            quote: MarketDetail | null;
            error?: boolean;
        }>
    ): void => {
        if (!marketTableBody) {
            return;
        }

        marketTableBody.replaceChildren();

        if (!rows.length) {
            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td
                    colspan="5"
                    class="market-table-state"
                >
                    No markets in this category.
                </td>
            `;

            marketTableBody.appendChild(
                row
            );

            return;
        }

        rows.forEach(
            ({
                instrument,
                quote,
                error
            }) => {
                const row =
                    document.createElement("tr");

                if (
                    instrument.symbol ===
                    selectedSymbol
                ) {
                    row.classList.add(
                        "selected"
                    );
                }

                if (error || !quote) {
                    row.innerHTML = `
                        <td>
                            <button
                                type="button"
                                class="market-row-button"
                                data-symbol="${escapeHtml(
                                    instrument.symbol
                                )}"
                            >
                                <strong>
                                    ${escapeHtml(
                                        instrument.symbol
                                    )}
                                </strong>

                                <span>
                                    Data unavailable
                                </span>
                            </button>
                        </td>

                        <td class="numeric">
                            —
                        </td>

                        <td class="numeric">
                            —
                        </td>

                        <td>
                            <span class="market-status unknown">
                                —
                            </span>
                        </td>

                        <td>
                            <button
                                type="button"
                                class="market-open-button"
                                data-symbol="${escapeHtml(
                                    instrument.symbol
                                )}"
                            >
                                Open
                            </button>
                        </td>
                    `;

                    marketTableBody.appendChild(
                        row
                    );

                    return;
                }

                const changeClass =
                    quote.changePercent > 0
                        ? "positive"
                        : quote.changePercent < 0
                            ? "negative"
                            : "neutral";

                const statusClass =
                    quote.marketOpen
                        ? "open"
                        : "closed";

                row.innerHTML = `
                    <td>
                        <button
                            type="button"
                            class="market-row-button"
                            data-symbol="${escapeHtml(
                                quote.symbol
                            )}"
                        >
                            <strong>
                                ${escapeHtml(
                                    quote.symbol
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    quote.name
                                )}
                            </span>
                        </button>
                    </td>

                    <td class="numeric">
                        ${formatPrice(
                            quote.price
                        )}
                    </td>

                    <td
                        class="numeric ${changeClass}"
                    >
                        ${formatPercent(
                            quote.changePercent
                        )}
                    </td>

                    <td>
                        <span
                            class="market-status ${statusClass}"
                        >
                            ${
                                quote.marketOpen
                                    ? "Open"
                                    : "Closed"
                            }
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="market-open-button"
                            data-symbol="${escapeHtml(
                                quote.symbol
                            )}"
                        >
                            Open
                        </button>
                    </td>
                `;

                marketTableBody.appendChild(
                    row
                );
            }
        );

        marketTableBody
            .querySelectorAll<HTMLButtonElement>(
                "[data-symbol]"
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        "click",
                        () => {
                            const symbol =
                                button.dataset.symbol;

                            if (symbol) {
                                void selectMarket(
                                    symbol
                                );
                            }
                        }
                    );
                }
            );
    };

const loadMarketTable =
    async (): Promise<void> => {
        setText(
            marketListState,
            "Loading"
        );

        let instruments =
            DEFAULT_MARKETS;

        if (
            currentFilter !==
            "all"
        ) {
            instruments =
                DEFAULT_MARKETS.filter(
                    (item) =>
                        item.type ===
                        currentFilter
                );
        }

        const results =
            await Promise.allSettled(
                instruments.map(
                    async (instrument) => ({
                        instrument,
                        quote:
                            await loadQuote(
                                instrument.symbol
                            )
                    })
                )
            );

        renderTable(
            results.map(
                (
                    result,
                    index
                ) => {
                    if (
                        result.status ===
                        "fulfilled"
                    ) {
                        return result.value;
                    }

                    return {
                        instrument:
                            instruments[index],
                        quote: null,
                        error: true
                    };
                }
            )
        );

        setText(
            marketListState,
            `${instruments.length} markets`
        );
    };

const renderDetail =
    (
        detail: MarketDetail
    ): void => {
        setText(
            detailSymbol,
            detail.symbol
        );

        setText(
            detailName,
            detail.name
        );

        setText(
            detailMeta,
            `${detail.exchange} · ${detail.currency}`
        );

        setText(
            detailPrice,
            `${formatPrice(
                detail.price
            )}`
        );

        setText(
            detailChange,
            `${formatPercent(
                detail.changePercent
            )} · ${formatPrice(
                detail.change
            )}`
        );

        const changeClass =
            detail.changePercent > 0
                ? "positive"
                : detail.changePercent < 0
                    ? "negative"
                    : "neutral";

        detailChange?.classList.remove(
            "positive",
            "negative",
            "neutral"
        );

        detailChange?.classList.add(
            changeClass
        );

        setText(
            detailStatus,
            detail.marketOpen
                ? "Open"
                : "Closed"
        );

        detailStatus?.classList.remove(
            "positive",
            "negative"
        );

        detailStatus?.classList.add(
            detail.marketOpen
                ? "positive"
                : "negative"
        );

        setText(
            detailOpen,
            formatPrice(detail.open)
        );

        setText(
            detailPreviousClose,
            formatPrice(
                detail.previousClose
            )
        );

        setText(
            detailHigh,
            formatPrice(detail.high)
        );

        setText(
            detailLow,
            formatPrice(detail.low)
        );

        setText(
            detailVolume,
            formatVolume(detail.volume)
        );

        setText(
            detailAverageVolume,
            formatVolume(
                detail.averageVolume
            )
        );

        setText(
            detail52WeekHigh,
            formatPrice(
                detail.fiftyTwoWeek.high
            )
        );

        setText(
            detail52WeekLow,
            formatPrice(
                detail.fiftyTwoWeek.low
            )
        );

        const direction =
            detail.change >= 0
                ? "long"
                : "short";

        if (positionSizeLink) {
            positionSizeLink.href =
                `position-size.html?symbol=${encodeURIComponent(
                    detail.symbol
                )}&entryPrice=${encodeURIComponent(
                    detail.price
                )}&direction=${direction}`;
        }

        if (riskRewardLink) {
            riskRewardLink.href =
                `risk-reward.html?symbol=${encodeURIComponent(
                    detail.symbol
                )}&entryPrice=${encodeURIComponent(
                    detail.price
                )}&direction=${direction}`;
        }

        if (pnlLink) {
            pnlLink.href =
                `pnl-calculator.html?symbol=${encodeURIComponent(
                    detail.symbol
                )}&exitPrice=${encodeURIComponent(
                    detail.price
                )}&direction=${direction}`;
        }
    };

const makeSvgElement =
    (
        tag: string,
        attributes: Record<
            string,
            string
        >
    ): SVGElement => {
        const element =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                tag
            );

        Object.entries(
            attributes
        ).forEach(
            ([key, value]) => {
                element.setAttribute(
                    key,
                    value
                );
            }
        );

        return element;
    };

const drawCandles =
    (
        values: MarketHistoryPoint[]
    ): void => {
        if (!chart) {
            return;
        }

        chart.replaceChildren();

        if (
            values.length <
            2
        ) {
            setText(
                chartState,
                "Not enough data"
            );

            return;
        }

        const width = 900;
        const height = 420;

        const padding = {
            top: 18,
            right: 72,
            bottom: 28,
            left: 10
        };

        const chartWidth =
            width -
            padding.left -
            padding.right;

        const chartHeight =
            height -
            padding.top -
            padding.bottom;

        const visibleValues =
            values
                .slice()
                .reverse();

        const prices =
            visibleValues.flatMap(
                (item) => [
                    item.high,
                    item.low
                ]
            );

        const minPrice =
            Math.min(...prices);

        const maxPrice =
            Math.max(...prices);

        const range =
            maxPrice -
            minPrice ||
            1;

        const yForPrice =
            (price: number): number =>
                padding.top +
                (
                    1 -
                    (
                        (price -
                            minPrice) /
                        range
                    )
                ) *
                    chartHeight;

        const candleGap =
            3;

        const candleWidth =
            Math.max(
                4,
                (
                    chartWidth /
                    visibleValues.length
                ) -
                    candleGap
            );

        const xForIndex =
            (index: number): number =>
                padding.left +
                index *
                    (
                        chartWidth /
                        visibleValues.length
                    ) +
                candleGap / 2;

        for (
            let i = 0;
            i <= 4;
            i += 1
        ) {
            const y =
                padding.top +
                (
                    i / 4
                ) *
                    chartHeight;

            const price =
                maxPrice -
                (
                    i / 4
                ) *
                    range;

            chart.appendChild(
                makeSvgElement(
                    "line",
                    {
                        x1:
                            String(
                                padding.left
                            ),
                        y1:
                            String(y),
                        x2:
                            String(
                                width -
                                    padding.right
                            ),
                        y2:
                            String(y),
                        class:
                            "chart-grid"
                    }
                )
            );

            const label =
                makeSvgElement(
                    "text",
                    {
                        x:
                            String(
                                width -
                                    padding.right +
                                    8
                            ),
                        y:
                            String(
                                y + 4
                            ),
                        class:
                            "chart-price-label"
                    }
                );

            label.textContent =
                formatPrice(
                    price
                );

            chart.appendChild(
                label
            );
        }

        visibleValues.forEach(
            (
                candle,
                index
            ) => {
                const x =
                    xForIndex(index);

                const openY =
                    yForPrice(
                        candle.open
                    );

                const closeY =
                    yForPrice(
                        candle.close
                    );

                const highY =
                    yForPrice(
                        candle.high
                    );

                const lowY =
                    yForPrice(
                        candle.low
                    );

                const rising =
                    candle.close >=
                    candle.open;

                const candleClass =
                    rising
                        ? "candle-up"
                        : "candle-down";

                const wick =
                    makeSvgElement(
                        "line",
                        {
                            x1:
                                String(
                                    x +
                                        candleWidth /
                                            2
                                ),
                            y1:
                                String(
                                    highY
                                ),
                            x2:
                                String(
                                    x +
                                        candleWidth /
                                            2
                                ),
                            y2:
                                String(
                                    lowY
                                ),
                            class:
                                `candle-wick ${candleClass}`
                        }
                    );

                const bodyTop =
                    Math.min(
                        openY,
                        closeY
                    );

                const bodyHeight =
                    Math.max(
                        1,
                        Math.abs(
                            openY -
                                closeY
                        )
                    );

                const body =
                    makeSvgElement(
                        "rect",
                        {
                            x:
                                String(
                                    x
                                ),
                            y:
                                String(
                                    bodyTop
                                ),
                            width:
                                String(
                                    candleWidth
                                ),
                            height:
                                String(
                                    bodyHeight
                                ),
                            class:
                                `candle-body ${candleClass}`
                        }
                    );

                const group =
                    makeSvgElement(
                        "g",
                        {
                            class:
                                "candle-group"
                        }
                    );

                group.append(
                    wick,
                    body
                );

                group.addEventListener(
                    "mouseenter",
                    (event) => {
                        if (
                            !chartTooltip
                        ) {
                            return;
                        }

                        const target =
                            event.currentTarget as SVGElement;

                        const rect =
                            chart?.getBoundingClientRect();

                        const targetRect =
                            target.getBoundingClientRect();

                        if (
                            !rect ||
                            !targetRect
                        ) {
                            return;
                        }

                        chartTooltip.hidden =
                            false;

                        chartTooltip.style.left =
                            `${Math.min(
                                targetRect.left -
                                    rect.left +
                                    targetRect.width / 2,
                                rect.width -
                                    130
                            )}px`;

                        chartTooltip.style.top =
                            `${Math.max(
                                targetRect.top -
                                    rect.top -
                                    90,
                                8
                            )}px`;

                        chartTooltip.innerHTML = `
                            <strong>
                                ${formatDate(
                                    candle.datetime
                                )}
                            </strong>

                            <span>
                                O ${formatPrice(
                                    candle.open
                                )}
                            </span>

                            <span>
                                H ${formatPrice(
                                    candle.high
                                )}
                            </span>

                            <span>
                                L ${formatPrice(
                                    candle.low
                                )}
                            </span>

                            <span>
                                C ${formatPrice(
                                    candle.close
                                )}
                            </span>
                        `;
                    }
                );

                group.addEventListener(
                    "mouseleave",
                    () => {
                        if (
                            chartTooltip
                        ) {
                            chartTooltip.hidden =
                                true;
                        }
                    }
                );

                chart.appendChild(
                    group
                );
            }
        );

        const last =
            visibleValues[
                visibleValues.length -
                    1
            ];

        const latestY =
            yForPrice(
                last.close
            );

        chart.appendChild(
            makeSvgElement(
                "line",
                {
                    x1:
                        String(
                            padding.left
                        ),
                    y1:
                        String(
                            latestY
                        ),
                    x2:
                        String(
                            width -
                                padding.right
                        ),
                    y2:
                        String(
                            latestY
                        ),
                    class:
                        "chart-last-price"
                }
            )
        );
    };

const selectMarket =
    async (
        symbol: string
    ): Promise<void> => {
        selectedSymbol =
            symbol;

        const instrument =
            DEFAULT_MARKETS.find(
                (item) =>
                    item.symbol ===
                    symbol
            );

        selectedInstrument =
            instrument || {
                symbol,
                type:
                    getInstrumentType(
                        symbol
                    )
            };

        const matchingButtons =
            marketTableBody?.querySelectorAll<HTMLButtonElement>(
                "[data-symbol]"
            );

        matchingButtons?.forEach(
            (button) => {
                const row =
                    button.closest("tr");

                row?.classList.toggle(
                    "selected",
                    button.dataset.symbol ===
                        symbol
                );
            }
        );

        try {
            const detail =
                await loadQuote(
                    symbol
                );

            selectedQuote =
                detail;

            renderDetail(
                detail
            );

            await loadHistory(
                symbol,
                currentInterval
            );
        } catch (error) {
            console.error(
                "Market selection error:",
                error
            );

            setText(
                detailName,
                "Market unavailable"
            );

            setText(
                detailMeta,
                error instanceof Error
                    ? error.message
                    : "Unable to load market"
            );

            setText(
                detailPrice,
                "—"
            );

            setText(
                detailChange,
                "—"
            );

            setText(
                chartState,
                "Unavailable"
            );

            chart?.replaceChildren();
        }
    };

const loadWatchlist =
    async (): Promise<MarketInstrument[]> => {
        const client =
            getSupabaseClient();

        if (!client) {
            return [];
        }

        const {
            data: { user }
        } =
            await client.auth.getUser();

        if (!user) {
            return [];
        }

        const {
            data,
            error
        } =
            await client
                .from(
                    "watchlist_items"
                )
                .select(
                    "symbol, asset_type"
                )
                .eq(
                    "user_id",
                    user.id
                );

        if (error) {
            return [];
        }

        const values =
            Array.isArray(data)
                ? data
                : [];

        return values.map(
            (
                item: {
                    symbol: string;
                    asset_type: string;
                }
            ) => ({
                symbol:
                    String(
                        item.symbol
                    ),

                type:
                    item.asset_type ===
                        "stock" ||
                    item.asset_type ===
                        "forex"
                        ? item.asset_type
                        : "crypto"
            })
        );
    };

const renderSuggestions =
    (
        results: MarketSearchResult[]
    ): void => {
        if (!suggestions) {
            return;
        }

        suggestions.replaceChildren();

        if (!results.length) {
            suggestions.hidden =
                true;

            return;
        }

        results
            .slice(0, 8)
            .forEach(
                (result) => {
                    const button =
                        document.createElement(
                            "button"
                        );

                    button.type =
                        "button";

                    button.className =
                        "suggestion-item";

                    button.innerHTML = `
                        <strong>
                            ${escapeHtml(
                                result.symbol
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                result.instrument_name ||
                                    "Unknown instrument"
                            )}
                        </span>

                        <small>
                            ${escapeHtml(
                                result.exchange ||
                                    "Market"
                            )}
                        </small>
                    `;

                    button.addEventListener(
                        "click",
                        () => {
                            if (
                                searchInput
                            ) {
                                searchInput.value =
                                    result.symbol;
                            }

                            suggestions.hidden =
                                true;

                            void selectMarket(
                                result.symbol
                            );
                        }
                    );

                    suggestions.appendChild(
                        button
                    );
                }
            );

        suggestions.hidden =
            false;
    };

const searchMarkets =
    async (
        query: string
    ): Promise<void> => {
        if (
            query.trim().length <
            2
        ) {
            if (suggestions) {
                suggestions.hidden =
                    true;
            }

            return;
        }

        try {
            const response =
                await fetch(
                    `/api/search?query=${encodeURIComponent(
                        query
                    )}`
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Search failed"
                );
            }

            renderSuggestions(
                Array.isArray(
                    data.results
                )
                    ? data.results
                    : []
            );
        } catch {
            if (suggestions) {
                suggestions.hidden =
                    true;
            }
        }
    };

const initialize =
    async (): Promise<void> => {
        const watchlist =
            await loadWatchlist();

        const instruments = [
            ...watchlist,
            ...DEFAULT_MARKETS
        ].filter(
            (
                item,
                index,
                array
            ) =>
                array.findIndex(
                    (candidate) =>
                        candidate.symbol ===
                        item.symbol
                ) === index
        );

        DEFAULT_MARKETS.splice(
            0,
            DEFAULT_MARKETS.length,
            ...instruments
        );

        await loadMarketTable();

        await selectMarket(
            selectedSymbol
        );

        const activeFilter =
            document.querySelector(
                ".market-filter.active"
            );

        if (activeFilter) {
            activeFilter.scrollIntoView({
                block: "nearest",
                inline: "nearest"
            });
        }
    };

filters.forEach(
    (button) => {
        button.addEventListener(
            "click",
            () => {
                filters.forEach(
                    (item) => {
                        item.classList.remove(
                            "active"
                        );
                    }
                );

                button.classList.add(
                    "active"
                );

                const value =
                    button.dataset
                        .marketFilter;

                if (
                    value === "crypto" ||
                    value === "stock" ||
                    value === "forex"
                ) {
                    currentFilter =
                        value;
                } else {
                    currentFilter =
                        "all";
                }

                void loadMarketTable();
            }
        );
    }
);

timeframeButtons.forEach(
    (button) => {
        button.addEventListener(
            "click",
            () => {
                timeframeButtons.forEach(
                    (item) =>
                        item.classList.remove(
                            "active"
                        )
                );

                button.classList.add(
                    "active"
                );

                currentInterval =
                    button.dataset
                        .interval ||
                    "1h";

                if (
                    selectedQuote
                ) {
                    void loadHistory(
                        selectedSymbol,
                        currentInterval
                    );
                }
            }
        );
    }
);

searchInput?.addEventListener(
    "input",
    () => {
        if (
            searchTimer !==
            undefined
        ) {
            window.clearTimeout(
                searchTimer
            );
        }

        searchTimer =
            window.setTimeout(
                () => {
                    void searchMarkets(
                        searchInput.value
                    );
                },
                300
            );
    }
);

searchInput?.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key !==
            "Enter"
        ) {
            return;
        }

        event.preventDefault();

        const value =
            searchInput.value
                .trim()
                .toUpperCase();

        if (value) {
            if (suggestions) {
                suggestions.hidden =
                    true;
            }

            void selectMarket(
                value
            );
        }
    }
);

document.addEventListener(
    "click",
    (event) => {
        const target =
            event.target as Node;

        if (
            suggestions &&
            searchInput &&
            !suggestions.contains(
                target
            ) &&
            !searchInput.contains(
                target
            )
        ) {
            suggestions.hidden =
                true;
        }
    }
);

void initialize();