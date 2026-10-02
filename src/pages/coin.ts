import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/app-shell.css";
import "./coin.css";

import {
    mountMarketStrip
} from "../components/market-strip";

const form =
    document.querySelector<HTMLFormElement>(
        "#coin-form"
    );

const symbolInput =
    document.querySelector<HTMLInputElement>(
        "#coin-symbol"
    );

const loadButton =
    document.querySelector<HTMLButtonElement>(
        "#load-coin"
    );

const message =
    document.querySelector<HTMLElement>(
        "#coin-message"
    );

const coinResult =
    document.querySelector<HTMLElement>(
        "#coin-result"
    );

const coinName =
    document.querySelector<HTMLElement>(
        "#coin-name"
    );

const coinDetails =
    document.querySelector<HTMLElement>(
        "#coin-details"
    );

const coinPrice =
    document.querySelector<HTMLElement>(
        "#coin-price"
    );

const coinChange =
    document.querySelector<HTMLElement>(
        "#coin-change"
    );

const coinSymbol =
    document.querySelector<HTMLElement>(
        "#coin-symbol-result"
    );

const coinExchange =
    document.querySelector<HTMLElement>(
        "#coin-exchange"
    );

const coinCurrency =
    document.querySelector<HTMLElement>(
        "#coin-currency"
    );

const coinOpen =
    document.querySelector<HTMLElement>(
        "#coin-open"
    );

const coinHigh =
    document.querySelector<HTMLElement>(
        "#coin-high"
    );

const coinLow =
    document.querySelector<HTMLElement>(
        "#coin-low"
    );

const coinPreviousClose =
    document.querySelector<HTMLElement>(
        "#coin-previous-close"
    );

const coinVolume =
    document.querySelector<HTMLElement>(
        "#coin-volume"
    );

const formatPrice = (
    value: number
): string => {
    if (!Number.isFinite(value)) {
        return "—";
    }

    return new Intl.NumberFormat(
        undefined,
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        }
    ).format(value);
};

const formatVolume = (
    value: number
): string => {
    if (!Number.isFinite(value)) {
        return "—";
    }

    return new Intl.NumberFormat(
        undefined
    ).format(value);
};

const setMessage = (
    value: string
): void => {
    if (message) {
        message.textContent =
            value;
    }
};

const setText = (
    element: HTMLElement | null,
    value: string
): void => {
    if (element) {
        element.textContent =
            value;
    }
};

const loadCoin =
    async (): Promise<void> => {
        const symbol =
            (
                symbolInput?.value ||
                ""
            )
                .trim()
                .toUpperCase();

        if (!symbol) {
            setMessage(
                "Enter a coin symbol."
            );

            return;
        }

        if (loadButton) {
            loadButton.disabled =
                true;

            loadButton.textContent =
                "Loading...";
        }

        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/coin?symbol=${encodeURIComponent(
                        symbol
                    )}`
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to load coin data."
                );
            }

            setText(
                coinName,
                data.name ||
                    data.symbol ||
                    symbol
            );

            setText(
                coinDetails,
                `${data.symbol} · ${data.exchange}`
            );

            setText(
                coinPrice,
                `${data.currency} ${formatPrice(
                    Number(data.price)
                )}`
            );

            const change =
                Number(data.change);

            const changePercent =
                Number(
                    data.changePercent
                );

            const sign =
                change > 0
                    ? "+"
                    : "";

            setText(
                coinChange,
                `${sign}${formatPrice(
                    change
                )} (${sign}${formatPrice(
                    changePercent
                )}%)`
            );

            if (coinChange) {
                coinChange.dataset.direction =
                    change > 0
                        ? "positive"
                        : change < 0
                            ? "negative"
                            : "neutral";
            }

            setText(
                coinSymbol,
                data.symbol
            );

            setText(
                coinExchange,
                data.exchange
            );

            setText(
                coinCurrency,
                data.currency
            );

            setText(
                coinOpen,
                formatPrice(
                    Number(data.open)
                )
            );

            setText(
                coinHigh,
                formatPrice(
                    Number(data.high)
                )
            );

            setText(
                coinLow,
                formatPrice(
                    Number(data.low)
                )
            );

            setText(
                coinPreviousClose,
                formatPrice(
                    Number(
                        data.previousClose
                    )
                )
            );

            setText(
                coinVolume,
                formatVolume(
                    Number(data.volume)
                )
            );

            if (coinResult) {
                coinResult.hidden =
                    false;
            }
        } catch (error) {
            if (coinResult) {
                coinResult.hidden =
                    false;
            }

            setText(
                coinName,
                "Unable to load coin"
            );

            setText(
                coinDetails,
                error instanceof Error
                    ? error.message
                    : "Unable to load coin data."
            );

            setText(
                coinPrice,
                "—"
            );

            setText(
                coinChange,
                "—"
            );

            if (coinChange) {
                coinChange.dataset.direction =
                    "neutral";
            }

            [
                coinSymbol,
                coinExchange,
                coinCurrency,
                coinOpen,
                coinHigh,
                coinLow,
                coinPreviousClose,
                coinVolume
            ].forEach(
                (element) => {
                    setText(
                        element,
                        "—"
                    );
                }
            );
        } finally {
            if (loadButton) {
                loadButton.disabled =
                    false;

                loadButton.textContent =
                    "View Coin";
            }
        }
    };

form?.addEventListener(
    "submit",
    (event) => {
        event.preventDefault();

        void loadCoin();
    }
);

mountMarketStrip();