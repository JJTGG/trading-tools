document.addEventListener("DOMContentLoaded", () => {
    const symbolInput = document.querySelector("#market-symbol");
    const loadButton = document.querySelector("#load-market");
    const suggestions = document.querySelector("#market-suggestions");
    const marketResult = document.querySelector("#market-result");

    const marketName = document.querySelector("#market-name");
    const marketDetails = document.querySelector("#market-details");
    const marketPrice = document.querySelector("#market-price");
    const marketChange = document.querySelector("#market-change");
    const marketSymbol = document.querySelector("#market-symbol-result");
    const marketExchange = document.querySelector("#market-exchange");
    const marketCurrency = document.querySelector("#market-currency");
    const marketStatus = document.querySelector("#market-status");

    let searchTimer;

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

            const changeSign = data.change > 0 ? "+" : "";

marketChange.textContent =
    `${changeSign}${data.change.toFixed(2)} (${changeSign}${data.changePercent.toFixed(2)}%)`;

marketChange.style.color =
    data.change > 0
        ? "var(--positive)"
        : data.change < 0
            ? "var(--negative)"
            : "var(--text-muted)";

            marketSymbol.textContent = data.symbol;
            marketExchange.textContent = data.exchange;
            marketCurrency.textContent = data.currency;
            const marketIsOpen = Boolean(data.marketOpen);

marketStatus.textContent = marketIsOpen ? "Open" : "Closed";
marketStatus.dataset.status = marketIsOpen ? "open" : "closed";

            marketResult.hidden = false;
        } catch (error) {
            marketResult.hidden = false;
            marketName.textContent = "Unable to load market";
            marketDetails.textContent = error.message;

            marketPrice.textContent = "—";
            marketChange.textContent = "—";
            marketChange.style.color = "var(--text-muted)";
            marketSymbol.textContent = "—";
            marketExchange.textContent = "—";
            marketCurrency.textContent = "—";
            marketStatus.textContent = "—";
            marketStatus.removeAttribute("data-status");
        } finally {
            loadButton.disabled = false;
            loadButton.textContent = "Check Market";
        }
    };

    const searchMarkets = async () => {
        const query = symbolInput.value.trim();

        if (query.length < 2) {
            suggestions.hidden = true;
            suggestions.innerHTML = "";
            return;
        }

        try {
            const response = await fetch(
                `/api/search?query=${encodeURIComponent(query)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Unable to search markets");
            }

            suggestions.innerHTML = "";

            data.results.slice(0, 6).forEach((market) => {
                const button = document.createElement("button");

                button.type = "button";
                button.className = "market-suggestion";
                button.innerHTML = `
                    <strong>${market.symbol}</strong>
                    <span>${market.instrument_name} · ${market.exchange}</span>
                `;

                button.addEventListener("click", () => {
                    symbolInput.value = market.symbol;
                    suggestions.hidden = true;
                    suggestions.innerHTML = "";
                    loadMarket();
                });

                suggestions.appendChild(button);
            });

            suggestions.hidden = data.results.length === 0;
        } catch {
            suggestions.hidden = true;
            suggestions.innerHTML = "";
        }
    };

    symbolInput.addEventListener("input", () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(searchMarkets, 300);
    });

    loadButton.addEventListener("click", loadMarket);

    symbolInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            loadMarket();
        }
    });
});