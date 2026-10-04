const tools = [
    {
        name: "Position Size",
        category: "Risk",
        status: "Live",
        route: "/position-size.html",
        description:
            "Convert defined account risk into a position size."
    },
    {
        name: "Risk / Reward",
        category: "Risk",
        status: "Live",
        route: "/risk-reward.html",
        description:
            "Compare defined trade risk with potential reward."
    },
    {
        name: "PnL",
        category: "Risk",
        status: "Live",
        route: "/pnl-calculator.html",
        description:
            "Measure trade profit or loss from price movement, size, and fees."
    },
    {
        name: "Leverage",
        category: "Risk",
        status: "Live",
        route: "/leverage.html",
        description:
            "Measure exposure, effective leverage, and required margin."
    },
    {
        name: "Currency Converter",
        category: "Market",
        status: "Live",
        route: "/currency.html",
        description:
            "Convert between supported currencies using current rates."
    },
    {
        name: "Coin Viewer",
        category: "Market",
        status: "Live",
        route: "/coin.html",
        description:
            "Inspect cryptocurrency information and market data."
    },
    {
        name: "Arbitrage Finder",
        category: "Market",
        status: "Planned",
        route: null,
        description:
            "Compare market prices across supported venues."
    },
    {
        name: "Algo Simulator",
        category: "Strategy",
        status: "Planned",
        route: null,
        description:
            "Experiment with algorithmic trading ideas without execution."
    }
];

export const renderAdminTools = (
    container: HTMLElement
): void => {
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "admin-tools";

    const header = document.createElement("div");
    header.className = "admin-section-header";

    header.innerHTML = `
        <div>
            <span class="panel-kicker">
                Tool Operations
            </span>

            <h2>
                Product tools
            </h2>

            <p>
                Current tool inventory and operational status.
            </p>
        </div>

        <span class="admin-section-meta">
            ${tools.length} tools
        </span>
    `;

    wrapper.appendChild(header);

    const registry = document.createElement("div");
    registry.className = "admin-tool-registry";

    for (const tool of tools) {
        const row = document.createElement("div");
        row.className = "admin-tool-row";

        const statusClass =
            tool.status === "Live"
                ? "live"
                : "planned";

        const routeMarkup = tool.route
            ? `
                <a
                    href="${tool.route}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Open tool
                </a>
            `
            : `
                <span class="admin-tool-route">
                    No live route
                </span>
            `;

        row.innerHTML = `
            <div class="admin-tool-main">
                <div class="admin-tool-title">
                    <strong>${tool.name}</strong>

                    <span class="admin-tool-status ${statusClass}">
                        ${tool.status}
                    </span>
                </div>

                <p>
                    ${tool.description}
                </p>
            </div>

            <div class="admin-tool-meta">
                <span>
                    ${tool.category}
                </span>

                ${routeMarkup}
            </div>
        `;

        registry.appendChild(row);
    }

    wrapper.appendChild(registry);

    const note = document.createElement("div");
    note.className = "admin-panel-note";

    note.innerHTML = `
        <strong>Operational boundary</strong>

        <p>
            Tool availability is currently defined by the application
            registry. Administrative controls for disabling, scheduling,
            or restricting tools will be introduced only when the product
            has a real operational need for them.
        </p>
    `;

    wrapper.appendChild(note);

    container.appendChild(wrapper);
};