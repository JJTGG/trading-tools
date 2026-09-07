document.addEventListener("DOMContentLoaded", () => {
    const symbolInput = document.querySelector("#market-symbol");
    const loadButton = document.querySelector("#load-market");
    const marketResult = document.querySelector("#market-result");

    const marketName = document.querySelector("#market-name");
    const marketDetails = document.querySelector("#market-details");
    const marketPrice = document.querySelector("#market-price");
    const marketChange = document.querySelector("#market-change");
    const marketSymbol = document.querySelector("#market-symbol-result");
    const marketExchange = document.querySelector("#market-exchange");
    const marketCurrency = document.querySelector("#market-currency");
    const marketStatus = document.querySelector("#market-status");

    const loadMarket = async () => {
        const symbol = symbolInput.value.trim().toUpperCase();

        if (!symbol) {
            return;
        }

        loadButton.disabled = true;
        loadButton.textContent = "Loading...";

        try {
            const response = await fetch(
                `/api/market?symbol=${encodeURIComponent(symbol)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Unable to load market data");
            }

            marketName.textContent = data.name;
            marketDetails.textContent =
                `${data.exchange} · ${data.currency}`;

            marketPrice.textContent =
                `${data.currency} ${data.price.toLocaleString()}`;

            const changeSign = data.change >= 0 ? "+" : "";

            marketChange.textContent =
                `${changeSign}${data.change.toFixed(2)} (${changeSign}${data.changePercent.toFixed(2)}%)`;

            marketSymbol.textContent = data.symbol;
            marketExchange.textContent = data.exchange;
            marketCurrency.textContent = data.currency;
            marketStatus.textContent =
                data.marketOpen ? "Open" : "Closed";

            marketResult.hidden = false;
        } catch (error) {
            marketResult.hidden = false;
            marketName.textContent = "Unable to load market";
            marketDetails.textContent = error.message;

            marketPrice.textContent = "—";
            marketChange.textContent = "—";
            marketSymbol.textContent = "—";
            marketExchange.textContent = "—";
            marketCurrency.textContent = "—";
            marketStatus.textContent = "—";
        } finally {
            loadButton.disabled = false;
            loadButton.textContent = "Check Market";
        }
    };

    loadButton.addEventListener("click", loadMarket);

    symbolInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            loadMarket();
        }
    });
});