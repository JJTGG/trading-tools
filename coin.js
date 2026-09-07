document.addEventListener("DOMContentLoaded", () => {
    const symbolInput =
        document.querySelector("#coin-symbol");

    const loadButton =
        document.querySelector("#load-coin");

    const coinResult =
        document.querySelector("#coin-result");

    const coinName =
        document.querySelector("#coin-name");

    const coinDetails =
        document.querySelector("#coin-details");

    const coinPrice =
        document.querySelector("#coin-price");

    const coinChange =
        document.querySelector("#coin-change");

    const coinSymbol =
        document.querySelector("#coin-symbol-result");

    const coinExchange =
        document.querySelector("#coin-exchange");

    const coinCurrency =
        document.querySelector("#coin-currency");

    const coinOpen =
        document.querySelector("#coin-open");

    const coinHigh =
        document.querySelector("#coin-high");

    const coinLow =
        document.querySelector("#coin-low");

    const coinPreviousClose =
        document.querySelector("#coin-previous-close");

    const coinVolume =
        document.querySelector("#coin-volume");

    const formatPrice = (value) => {
        if (!Number.isFinite(Number(value))) {
            return "—";
        }

        return Number(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        });
    };

    const formatVolume = (value) => {
        if (!Number.isFinite(Number(value))) {
            return "—";
        }

        return Number(value).toLocaleString();
    };

    const loadCoin = async () => {
        const symbol =
            symbolInput.value.trim().toUpperCase();

        if (!symbol) {
            return;
        }

        loadButton.disabled = true;
        loadButton.textContent = "Loading...";

        try {
            const response = await fetch(
                `/api/coin?symbol=${encodeURIComponent(symbol)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Unable to load coin data"
                );
            }

            coinName.textContent =
                data.name || data.symbol;

            coinDetails.textContent =
                `${data.symbol} · ${data.exchange}`;

            coinPrice.textContent =
                `${data.currency} ${formatPrice(data.price)}`;

            const changeSign =
                data.change > 0 ? "+" : "";

            coinChange.textContent =
                `${changeSign}${formatPrice(data.change)} (${changeSign}${formatPrice(data.changePercent)}%)`;

            coinChange.style.color =
                data.change > 0
                    ? "var(--positive)"
                    : data.change < 0
                        ? "var(--negative)"
                        : "var(--text-muted)";

            coinSymbol.textContent =
                data.symbol;

            coinExchange.textContent =
                data.exchange;

            coinCurrency.textContent =
                data.currency;

            coinOpen.textContent =
                formatPrice(data.open);

            coinHigh.textContent =
                formatPrice(data.high);

            coinLow.textContent =
                formatPrice(data.low);

            coinPreviousClose.textContent =
                formatPrice(data.previousClose);

            coinVolume.textContent =
                formatVolume(data.volume);

            coinResult.hidden = false;
        } catch (error) {
            coinResult.hidden = false;

            coinName.textContent =
                "Unable to load coin";

            coinDetails.textContent =
                error.message;

            coinPrice.textContent = "—";
            coinChange.textContent = "—";
            coinChange.style.color =
                "var(--text-muted)";

            coinSymbol.textContent = "—";
            coinExchange.textContent = "—";
            coinCurrency.textContent = "—";
            coinOpen.textContent = "—";
            coinHigh.textContent = "—";
            coinLow.textContent = "—";
            coinPreviousClose.textContent = "—";
            coinVolume.textContent = "—";
        } finally {
            loadButton.disabled = false;
            loadButton.textContent = "View Coin";
        }
    };

    loadButton.addEventListener(
        "click",
        loadCoin
    );

    symbolInput.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                loadCoin();
            }
        }
    );
});