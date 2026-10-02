import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/app-shell.css";
import "./guide.css";

import {
    mountMarketStrip
} from "../components/market-strip";

const filterButtons =
    Array.from(
        document.querySelectorAll<HTMLButtonElement>(
            ".guide-filter"
        )
    );

const searchInput =
    document.querySelector<HTMLInputElement>(
        "#guide-search-input"
    );

const topics =
    Array.from(
        document.querySelectorAll<HTMLElement>(
            ".reference-entry"
        )
    );

const sections =
    Array.from(
        document.querySelectorAll<HTMLElement>(
            ".reference-section"
        )
    );

const workflowSection =
    document.querySelector<HTMLElement>(
        ".workflow-reference"
    );

const emptyState =
    document.querySelector<HTMLElement>(
        "#guide-empty"
    );

let activeCategory = "all";

const normalize = (
    value: string
): string => {
    return value
        .trim()
        .toLowerCase();
};

const matchesTopic = (
    topic: HTMLElement,
    query: string
): boolean => {
    const category =
        topic.dataset.category || "";

    const searchableText =
        normalize(
            `${topic.dataset.search || ""} ${
                topic.textContent || ""
            }`
        );

    const categoryMatches =
        activeCategory === "all" ||
        category === activeCategory;

    const searchMatches =
        !query ||
        searchableText.includes(query);

    return (
        categoryMatches &&
        searchMatches
    );
};

const updateGuide = (): void => {
    const query =
        normalize(
            searchInput?.value || ""
        );

    let visibleCount = 0;

    topics.forEach(
        (topic) => {
            const visible =
                matchesTopic(
                    topic,
                    query
                );

            topic.hidden =
                !visible;

            if (visible) {
                visibleCount += 1;
            }
        }
    );

    sections.forEach(
        (section) => {
            if (
                section === workflowSection
            ) {
                return;
            }

            const hasVisibleEntries =
                Array.from(
                    section.querySelectorAll<HTMLElement>(
                        ".reference-entry"
                    )
                ).some(
                    (topic) =>
                        !topic.hidden
                );

            section.hidden =
                !hasVisibleEntries;
        }
    );

    if (workflowSection) {
        workflowSection.hidden =
            Boolean(query) ||
            activeCategory !== "all";
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

                updateGuide();
            }
        );
    }
);

searchInput?.addEventListener(
    "input",
    updateGuide
);

mountMarketStrip();
updateGuide();