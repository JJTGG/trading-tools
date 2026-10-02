import "../styles/tokens.css";
import "../styles/base.css";
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
            ".guide-topic"
        )
    );

const sections =
    Array.from(
        document.querySelectorAll<HTMLElement>(
            ".guide-section"
        )
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

const topicMatches = (
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

    let visibleTopics = 0;

    sections.forEach(
        (section) => {
            const sectionTopics =
                Array.from(
                    section.querySelectorAll<HTMLElement>(
                        ".guide-topic"
                    )
                );

            let visibleInSection = 0;

            sectionTopics.forEach(
                (topic) => {
                    const visible =
                        topicMatches(
                            topic,
                            query
                        );

                    topic.hidden =
                        !visible;

                    if (visible) {
                        visibleInSection += 1;
                        visibleTopics += 1;
                    }
                }
            );

            const workflowSection =
                section.classList.contains(
                    "guide-workflow"
                );

            if (!workflowSection) {
                section.hidden =
                    visibleInSection === 0;
            } else if (
                activeCategory !== "all" ||
                query
            ) {
                section.hidden = true;
            } else {
                section.hidden = false;
            }
        }
    );

    if (emptyState) {
        emptyState.hidden =
            visibleTopics !== 0;
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