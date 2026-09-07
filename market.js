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

    const marketOpen = document.querySelector("#market-open");
    const marketPreviousClose =
        document.querySelector("#market-previous-close");
    const marketHigh = document.querySelector("#market-high");
    const marketLow = document.querySelector("#market-low");
    const marketVolume =
        document.querySelector("#market-volume");
    const marketAverageVolume =
        document.querySelector("#market-average-volume");
    const market52WeekHigh =
        document.querySelector("#market-52w-high");
    const market52WeekLow =
        document.querySelector("#market-52w-low");

    let searchTimer;
    let currentSymbol = "";
    let currentInterval = "1day";
    let chartValues = [];

    const formatPrice = (value) => {
        if (value == null || !Number.isFinite(Number(value))) {
            return "—";
        }

        return Number(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatVolume = (value) => {
        if (value == null || !Number.isFinite(Number(value))) {
            return "—";
        }

        return Number(value).toLocaleString();
    };

    const formatDate = (datetime) => {
        const date = new Date(`${datetime}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return datetime;
        }

        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric"
        });
    };

    const drawChart = (values) => {
        const rect = chartCanvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;

        const width = rect.width;
        const height = rect.height;

        chartCanvas.width = Math.max(1, width * ratio);
        chartCanvas.height = Math.max(1, height * ratio);

        chartContext.setTransform(ratio, 0, 0, ratio, 0, 0);
        chartContext.clearRect(0, 0, width, height);

        const prices = values
            .slice()
            .reverse()
            .map((item) => Number(item.close))
            .filter((price) => Number.isFinite(price));

        if (prices.length < 2) {
            chartContext.fillStyle = "#69707d";
            chartContext.font = "14px system-ui";
            chartContext.textAlign = "center";
            chartContext.textBaseline = "middle";

            chartContext.fillText(
                "Not enough data to display chart",
                width / 2,
                height / 2
            );

            return;
        }

        const padding = {
            top: 20,
            right: 62,
            bottom: 30,
            left: 12
        };

        const chartWidth =
            width - padding.left - padding.right;

        const chartHeight =
            height - padding.top - padding.bottom;

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || 1;

        const xForIndex = (index) => {
            return (
                padding.left +
                (index / (prices.length - 1)) * chartWidth
            );
        };

        const yForPrice = (price) => {
            return (
                padding.top +
                (1 - (price - minPrice) / priceRange) *
                    chartHeight
            );
        };

        chartContext.lineWidth = 1;
        chartContext.strokeStyle = "#e2e5e9";
        chartContext.fillStyle = "#69707d";
        chartContext.font = "11px system-ui";
        chartContext.textAlign = "left";
        chartContext.textBaseline = "middle";

        const gridLines = 4;

        for (let i = 0; i <= gridLines; i++) {
            const y =
                padding.top +
                (i / gridLines) * chartHeight;

            chartContext.beginPath();
            chartContext.moveTo(
                padding.left,
                y
            );
            chartContext.lineTo(
                width - padding.right,
                y
            );
            chartContext.stroke();

            const price =
                maxPrice -
                (i / gridLines) * priceRange;

            chartContext.fillText(
                formatPrice(price),
                width - padding.right + 8,
                y
            );
        }

        chartContext.textAlign = "center";
        chartContext.textBaseline = "top";

        const dateCount = Math.min(
            5,
            values.length
        );

        for (let i = 0; i < dateCount; i++) {
            const valueIndex =
                Math.round(
                    (i / Math.max(1, dateCount - 1)) *
                        (prices.length - 1)
                );

            const originalIndex =
                values.length - 1 - valueIndex;

            const value =
                values[originalIndex];

            if (!value) {
                continue;
            }

            chartContext.fillText(
                formatDate(value.datetime),
                xForIndex(valueIndex),
                height - padding.bottom + 10
            );
        }

        chartContext.beginPath();

        prices.forEach((price, index) => {
            const x = xForIndex(index);
            const y = yForPrice(price);

            if (index === 0) {
                chartContext.moveTo(x, y);
            } else {
                chartContext.lineTo(x, y);
            }
        });

        chartContext.strokeStyle = "#2563eb";
        chartContext.lineWidth = 2;
        chartContext.lineJoin = "round";
        chartContext.lineCap = "round";
        chartContext.stroke();

        const latestPrice =
            prices[prices.length - 1];

        const latestX =
            xForIndex(prices.length - 1);

        const latestY =
            yForPrice(latestPrice);

        chartContext.beginPath();
        chartContext.arc(
            latestX,
            latestY,
            4,
            0,
            Math.PI * 2
        );

        chartContext.fillStyle = "#2563eb";
        chartContext.fill();

        chartContext.fillStyle = "#111318";
        chartContext.font = "650 11px system-ui";
        chartContext.textAlign = "right";
        chartContext.textBaseline = "bottom";

        chartContext.fillText(
            formatPrice(latestPrice),
            latestX,
            latestY - 8
        );
    };

    const loadMarketHistory = async (
        symbol,
        interval = currentInterval
    ) => {
        currentInterval = interval;

        try {
            const response = await fetch(
                `/api/time-series?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to load market history"
                );
            }

            chartValues = data.values || [];

            drawChart(chartValues);
            chartSection.hidden = false;
        } catch {
            chartSection.hidden = true;
        }
    };

    const resetMarketMetrics = () => {
        marketOpen.textContent = "—";
        marketPreviousClose.textContent = "—";
        marketHigh.textContent = "—";
        marketLow.textContent = "—";
        marketVolume.textContent = "—";
        marketAverageVolume.textContent = "—";
        market52WeekHigh.textContent = "—";
        market52WeekLow.textContent = "—";
    };

    const loadMarket = async () => {
        const symbol =
            symbolInput.value.trim().toUpperCase();

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
                    data.error ||
                        "Unable to load market data"
                );
            }

            marketName.textContent = data.name;

            marketDetails.textContent =
                `${data.exchange} · ${data.currency}`;

            marketPrice.textContent =
                `${data.currency} ${formatPrice(data.price)}`;

            const changeSign =
                data.change > 0 ? "+" : "";

            marketChange.textContent =
                `${changeSign}${data.change.toFixed(2)} (${changeSign}${data.changePercent.toFixed(2)}%)`;

            marketChange.style.color =
                data.change > 0
                    ? "var(--positive)"
                    : data.change < 0
                        ? "var(--negative)"
                        : "var(--text-muted)";

            marketSymbol.textContent =
                data.symbol;

            marketExchange.textContent =
                data.exchange;

            marketCurrency.textContent =
                data.currency;

            marketOpen.textContent =
                formatPrice(data.open);

            marketPreviousClose.textContent =
                formatPrice(data.previousClose);

            marketHigh.textContent =
                formatPrice(data.high);

            marketLow.textContent =
                formatPrice(data.low);

            marketVolume.textContent =
                formatVolume(data.volume);

            marketAverageVolume.textContent =
                formatVolume(data.averageVolume);

            market52WeekHigh.textContent =
                formatPrice(data.fiftyTwoWeek?.high);

            market52WeekLow.textContent =
                formatPrice(data.fiftyTwoWeek?.low);

            const marketIsOpen =
                Boolean(data.marketOpen);

            marketStatus.textContent =
                marketIsOpen
                    ? "Open"
                    : "Closed";

            marketStatus.dataset.status =
                marketIsOpen
                    ? "open"
                    : "closed";

            marketResult.hidden = false;

            await loadMarketHistory(
                symbol,
                currentInterval
            );
        } catch (error) {
            marketResult.hidden = false;

            marketName.textContent =
                "Unable to load market";

            marketDetails.textContent =
                error.message;

            marketPrice.textContent = "—";
            marketChange.textContent = "—";
            marketChange.style.color =
                "var(--text-muted)";

            marketSymbol.textContent = "—";
            marketExchange.textContent = "—";
            marketCurrency.textContent = "—";

            marketStatus.textContent = "—";
            marketStatus.removeAttribute(
                "data-status"
            );

            resetMarketMetrics();
            chartSection.hidden = true;
        } finally {
            loadButton.disabled = false;
            loadButton.textContent =
                "Check Market";
        }
    };

    const searchMarkets = async () => {
        const query =
            symbolInput.value.trim();

        if (query.length < 2) {
            suggestions.hidden = true;
            suggestions.innerHTML = "";
            return;
        }

        try {
            const response = await fetch(
                `/api/search?query=${encodeURIComponent(query)}`
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to search markets"
                );
            }

            suggestions.innerHTML = "";

            data.results
                .slice(0, 6)
                .forEach((market) => {
                    const button =
                        document.createElement(
                            "button"
                        );

                    button.type = "button";
                    button.className =
                        "market-suggestion";

                    button.innerHTML = `
                        <strong>${market.symbol}</strong>
                        <span>${market.instrument_name} · ${market.exchange}</span>
                    `;

                    button.addEventListener(
                        "click",
                        () => {
                            symbolInput.value =
                                market.symbol;

                            suggestions.hidden =
                                true;

                            suggestions.innerHTML =
                                "";

                            loadMarket();
                        }
                    );

                    suggestions.appendChild(
                        button
                    );
                });

            suggestions.hidden =
                data.results.length === 0;
        } catch {
            suggestions.hidden = true;
            suggestions.innerHTML = "";
        }
    };

    timeframeButtons.forEach((button) => {
        button.addEventListener(
            "click",
            async () => {
                if (!currentSymbol) {
                    return;
                }

                timeframeButtons.forEach(
                    (item) => {
                        item.classList.remove(
                            "active"
                        );
                    }
                );

                button.classList.add("active");

                await loadMarketHistory(
                    currentSymbol,
                    button.dataset.interval
                );
            }
        );
    });

    const activeTimeframe =
        document.querySelector(
            "#market-timeframes button.active"
        );

    if (!activeTimeframe) {
        const defaultTimeframe =
            document.querySelector(
                "#market-timeframes button"
            );

        if (defaultTimeframe) {
            defaultTimeframe.classList.add(
                "active"
            );

            if (defaultTimeframe.dataset.interval) {
                currentInterval =
                    defaultTimeframe.dataset.interval;
            }
        }
    } else if (
        activeTimeframe.dataset.interval
    ) {
        currentInterval =
            activeTimeframe.dataset.interval;
    }

    symbolInput.addEventListener(
        "input",
        () => {
            clearTimeout(searchTimer);

            searchTimer = setTimeout(
                searchMarkets,
                300
            );
        }
    );

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
            if (
                !chartSection.hidden &&
                chartValues.length
            ) {
                drawChart(chartValues);
            }
        }
    );
});