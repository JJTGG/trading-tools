import { supabaseClient } from "../data/supabase";

interface AnalyticsSummary {
    total_events: number;
    unique_users: number;
    tool_opens: number;
    calculations_completed: number;
    latest_event_at: string | null;
}

interface AnalyticsTool {
    page: string;
    tool_opens: number;
    calculations_completed: number;
    unique_users: number;
    last_activity_at: string | null;
}

const createElement = <
    K extends keyof HTMLElementTagNameMap
>(
    tag: K,
    className?: string
): HTMLElementTagNameMap[K] => {
    const element =
        document.createElement(tag);

    if (className) {
        element.className =
            className;
    }

    return element;
};

const formatToolName =
    (page: string): string =>
        page
            .replace(
                /[-_]/g,
                " "
            )
            .replace(
                /\b\w/g,
                (character) =>
                    character.toUpperCase()
            );

const formatDate =
    (value: string | null): string => {
        if (!value) {
            return "No activity";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return value;
        }

        return new Intl.DateTimeFormat(
            undefined,
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        ).format(date);
    };

const createMetric =
    (
        label: string,
        value: string
    ): HTMLElement => {
        const card =
            createElement(
                "article",
                "admin-summary-card"
            );

        const metricLabel =
            createElement(
                "span",
                "admin-summary-label"
            );

        metricLabel.textContent =
            label;

        const metricValue =
            createElement(
                "strong"
            );

        metricValue.textContent =
            value;

        card.append(
            metricLabel,
            metricValue
        );

        return card;
    };

export const renderProductAnalytics =
    async (
        container: HTMLElement
    ): Promise<void> => {
        container.hidden =
            false;

        container.replaceChildren();

        const wrapper =
            createElement(
                "div",
                "admin-analytics-panel"
            );

        const heading =
            createElement(
                "div",
                "admin-panel-view-heading"
            );

        const kicker =
            createElement(
                "span",
                "panel-kicker"
            );

        kicker.textContent =
            "Analytics";

        const title =
            createElement(
                "h2"
            );

        title.textContent =
            "Product usage";

        const description =
            createElement(
                "p"
            );

        description.textContent =
            "First-party product usage collected from authenticated Trading Tools accounts.";

        heading.append(
            kicker,
            title,
            description
        );

        const refreshButton =
            createElement(
                "button",
                "admin-button"
            );

        refreshButton.type =
            "button";

        refreshButton.textContent =
            "Refresh";

        const headingActions =
            createElement(
                "div",
                "admin-header-actions"
            );

        headingActions.append(
            refreshButton
        );

        const headingRow =
            createElement(
                "div",
                "admin-audit-heading-top"
            );

        headingRow.append(
            heading,
            headingActions
        );

        const status =
            createElement(
                "p",
                "admin-status"
            );

        status.hidden =
            true;

        const metrics =
            createElement(
                "div",
                "admin-summary"
            );

        const activityHeading =
            createElement(
                "div",
                "admin-panel-view-heading"
            );

        const activityKicker =
            createElement(
                "span",
                "panel-kicker"
            );

        activityKicker.textContent =
            "Tool activity";

        const activityTitle =
            createElement(
                "h2"
            );

        activityTitle.textContent =
            "Usage by tool";

        const activityDescription =
            createElement(
                "p"
            );

        activityDescription.textContent =
            "Counts are aggregated from first-party product events. Raw event records are not exposed through this panel.";

        activityHeading.append(
            activityKicker,
            activityTitle,
            activityDescription
        );

        const activityList =
            createElement(
                "div",
                "admin-role-matrix"
            );

        wrapper.append(
            headingRow,
            status,
            metrics,
            activityHeading,
            activityList
        );

        container.appendChild(
            wrapper
        );

        const loadAnalytics =
            async (): Promise<void> => {
                refreshButton.disabled =
                    true;

                status.hidden =
                    false;

                status.textContent =
                    "Loading product analytics…";

                metrics.replaceChildren();

                activityList.replaceChildren();

                const [
                    summaryResult,
                    toolsResult
                ] =
                    await Promise.all([
                        supabaseClient.rpc(
                            "get_product_analytics_summary"
                        ),
                        supabaseClient.rpc(
                            "get_product_analytics_tools"
                        )
                    ]);

                refreshButton.disabled =
                    false;

                if (
                    summaryResult.error ||
                    toolsResult.error
                ) {
                    console.error(
                        "Product analytics load error:",
                        summaryResult.error ||
                            toolsResult.error
                    );

                    status.textContent =
                        "Unable to load product analytics.";

                    return;
                }

                const summary =
                    (
                        summaryResult.data?.[0] ||
                        null
                    ) as AnalyticsSummary | null;

                const tools =
                    (
                        toolsResult.data ||
                        []
                    ) as AnalyticsTool[];

                if (!summary) {
                    status.textContent =
                        "No analytics summary is available.";

                    return;
                }

                metrics.append(
                    createMetric(
                        "Tracked events",
                        String(
                            summary.total_events
                        )
                    ),
                    createMetric(
                        "Unique accounts",
                        String(
                            summary.unique_users
                        )
                    ),
                    createMetric(
                        "Tool opens",
                        String(
                            summary.tool_opens
                        )
                    ),
                    createMetric(
                        "Calculations completed",
                        String(
                            summary.calculations_completed
                        )
                    )
                );

                status.textContent =
                    summary.latest_event_at
                        ? `Latest activity: ${formatDate(
                              summary.latest_event_at
                          )}`
                        : "No product activity recorded yet.";

                if (!tools.length) {
                    const empty =
                        createElement(
                            "div",
                            "admin-panel-placeholder"
                        );

                    const emptyTitle =
                        createElement(
                            "strong"
                        );

                    emptyTitle.textContent =
                        "No tool activity recorded yet.";

                    const emptyText =
                        createElement(
                            "span"
                        );

                    emptyText.textContent =
                        "Usage will appear here as authenticated users interact with Trading Tools.";

                    empty.append(
                        emptyTitle,
                        emptyText
                    );

                    activityList.appendChild(
                        empty
                    );

                    return;
                }

                tools.forEach(
                    (tool) => {
                        const card =
                            createElement(
                                "article",
                                "admin-role-card"
                            );

                        const header =
                            createElement(
                                "div",
                                "admin-role-card-header"
                            );

                        const name =
                            createElement(
                                "strong"
                            );

                        name.textContent =
                            formatToolName(
                                tool.page
                            );

                        const code =
                            createElement(
                                "span",
                                "admin-role-code"
                            );

                        code.textContent =
                            tool.page;

                        header.append(
                            name,
                            code
                        );

                        const stats =
                            createElement(
                                "div",
                                "admin-permission-list"
                            );

                        const opens =
                            createElement(
                                "span",
                                "admin-permission"
                            );

                        opens.textContent =
                            `Opens: ${tool.tool_opens}`;

                        const completions =
                            createElement(
                                "span",
                                "admin-permission"
                            );

                        completions.textContent =
                            `Completed: ${tool.calculations_completed}`;

                        const users =
                            createElement(
                                "span",
                                "admin-permission"
                            );

                        users.textContent =
                            `Accounts: ${tool.unique_users}`;

                        const lastActivity =
                            createElement(
                                "span",
                                "admin-permission"
                            );

                        lastActivity.textContent =
                            `Last: ${formatDate(
                                tool.last_activity_at
                            )}`;

                        stats.append(
                            opens,
                            completions,
                            users,
                            lastActivity
                        );

                        card.append(
                            header,
                            stats
                        );

                        activityList.appendChild(
                            card
                        );
                    }
                );
            };

        refreshButton.addEventListener(
            "click",
            () => {
                void loadAnalytics();
            }
        );

        await loadAnalytics();
    };