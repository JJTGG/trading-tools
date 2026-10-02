import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/app-shell.css";
import "./tools.css";

import {
    mountMarketStrip
} from "../components/market-strip";

const filterButtons =
    Array.from(
        document.querySelectorAll<HTMLButtonElement>(
            ".tool-filter"
        )
    );

const searchInput =
    document.querySelector<HTMLInputElement>(
        "#tool-search-input"
    );

const toolRows =
    Array.from(
        document.querySelectorAll<HTMLElement>(
            "#tool-registry .tool-row"
        )
    );

const emptyState =
    document.querySelector<HTMLElement>(
        "#tool-empty"
    );

const resultCount =
    document.querySelector<HTMLElement>(
        "#tool-result-count"
    );

let activeCategory = "all";

const normalize = (
    value: string
): string => {
    return value
        .trim()
        .toLowerCase();
};

const matchesTool = (
    tool: HTMLElement,
    query: string
): boolean => {
    const category =
        tool.dataset.category || "";

    const searchText =
        normalize(
            `${tool.dataset.search || ""} ${tool.textContent || ""}`
        );

    const categoryMatches =
        activeCategory === "all" ||
        category === activeCategory;

    const searchMatches =
        !query ||
        searchText.includes(query);

    return (
        categoryMatches &&
        searchMatches
    );
};

const updateToolList = (): void => {
    const query =
        normalize(
            searchInput?.value || ""
        );

    let visibleCount = 0;

    toolRows.forEach(
        (tool) => {
            const visible =
                matchesTool(
                    tool,
                    query
                );

            tool.hidden =
                !visible;

            if (visible) {
                visibleCount += 1;
            }
        }
    );

    if (resultCount) {
        resultCount.textContent =
            `${visibleCount} ${
                visibleCount === 1
                    ? "tool"
                    : "tools"
            }`;
    }

    if (emptyState) {
        emptyState.hidden =
            visibleCount !== 0;
    }
};

filterButtons.forEach(
    (button) => {
        button.addEventListener(
            "click",
            () => {
                activeCategory =
                    button.dataset.category ||
                    "all";

                filterButtons.forEach(
                    (item) => {
                        const active =
                            item === button;

                        item.classList.toggle(
                            "active",
                            active
                        );

                        item.setAttribute(
                            "aria-pressed",
                            String(active)
                        );
                    }
                );

                updateToolList();
            }
        );
    }
);

searchInput?.addEventListener(
    "input",
    updateToolList
);

mountMarketStrip();
updateToolList();