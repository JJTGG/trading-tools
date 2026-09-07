document.addEventListener("DOMContentLoaded", () => {
    const symbolInput = document.querySelector("#market-symbol");
    const loadButton = document.querySelector("#load-market");
    const suggestions = document.querySelector("#market-suggestions");
    const marketResult = document.querySelector("#market-result");

    const chartSection = document.querySelector("#market-chart-section");
    const chartCanvas = document.querySelector("#market-chart-canvas");
    const chartContext = chartCanvas.getContext("2d");
    const timeframeButtons =
        document.querySelectorAll("#market-timeframes button");

    const marketName = document.querySelector("#market-name");
    const marketDetails = document.querySelector("#market-details");
    const marketPrice = document.querySelector("#market-price");
    const marketChange = document.querySelector("#market-change");
    const marketSymbol = document.querySelector("#market-symbol-result");
    const marketExchange = document.querySelector("#market-exchange");
    const marketCurrency = document.querySelector("#market-currency");
    const marketStatus = document.querySelector("#market-status");

    let searchTimer;
    let currentSymbol = "";

    const drawChart = (values) => {
        const rect = chartCanvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;

        chartCanvas.width = rect.width * ratio;
        chartCanvas.height = rect.height * ratio;

        chartContext.setTransform(ratio, 0, 0, ratio, 0, 0);
        chartContext.clearRect(0, 0, rect.width, rect.height);

        const prices = values
            .slice()
            .reverse()
            .map((item) => item.close);

        if (prices.length < 2) {
            return;
        }

        const padding = 24;
        const width = rect.width - padding * 2;
        const height = rect.height - padding * 2;

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || 1;

        chartContext.beginPath();

        prices.forEach((price, index) => {
            const x =
                padding +
                (index / (prices.length - 1)) * width;

            const y =
                padding +
                (1 - (price - minPrice) / priceRange) * height;

            if (index === 0) {
                chartContext.moveTo(x, y);
            } else {
                chartContext.lineTo(x, y);
            }
        });

        chartContext.strokeStyle = "#2563eb";
        chartContext.lineWidth = 2;
        chartContext.stroke();
    };

    const loadMarketHistory = async (
        symbol,
        interval = "1day"
    ) => {
        try {
            const response = await fetch(
                `/api/time-series?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to load market history"
                );
            }

            drawChart(data.values);
            chartSection.hidden = false;
        } catch {
            chartSection.hidden = true;
        }
    };

    const loadMarket = async () => {
        const symbol = symbolInput.value.trim().toUpperCase();

        if (!symbol) {
            return;
        }

        currentSymbol = symbol;

        loadButton.disabled = true;
        loadButton.textContent = "Loading...";

        try {
            const response = await fetch(
                `/api/market?symbol=${encodeURIComponent(symbol)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to load market data"
                );
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

            marketStatus.textContent =
                marketIsOpen ? "Open" : "Closed";

            marketStatus.dataset.status =
                marketIsOpen ? "open" : "closed";

            marketResult.hidden = false;

            await loadMarketHistory(symbol);
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
            chartSection.hidden = true;
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
                throw new Error(
                    data.error || "Unable to search markets"
                );
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

            suggestions.hidden =
                data.results.length === 0;
        } catch {
            suggestions.hidden = true;
            suggestions.innerHTML = "";
        }
    };

    timeframeButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            if (!currentSymbol) {
                return;
            }

            timeframeButtons.forEach((item) => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            await loadMarketHistory(
                currentSymbol,
                button.dataset.interval
            );
        });
    });

    symbolInput.addEventListener("input", () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(
            searchMarkets,
            300
        );
    });

    loadButton.addEventListener(
        "click",
        loadMarket
    );

    symbolInput.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                loadMarket();
            }
        }
    );

    window.addEventListener(
        "resize",
        () => {
            if (!chartSection.hidden && currentSymbol) {
                loadMarketHistory(currentSymbol);
            }
        }
    );
});