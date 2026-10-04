import "../styles/tokens.css";
import "../styles/base.css";
import "./workspace.css";

import { mountMarketStrip } from "../components/market-strip";
import {
    buildTradeContextUrl,
    type TradeContext
} from "../data/trade-context";
import {
    createTradeSetup,
    deleteTradeSetup,
    getTradeSetups,
    type TradeSetup
} from "../data/trade-setups";

interface SupabaseError {
    message: string;
    code?: string;
}

interface SupabaseUser {
    id: string;
    email?: string;
}

interface SavedCalculation {
    id: string;
    tool: string;
    inputs:
        | Record<string, unknown>
        | null;
    result:
        | Record<string, unknown>
        | null;
    created_at: string;
}

interface WatchlistItem {
    id: string;
    symbol: string;
    asset_type: string;
    created_at: string;
}

interface Profile {
    display_name: string | null;
    onboarding_completed: boolean;
    workspace_preferences:
        | Record<string, unknown>
        | null;
    experience_level: string | null;
}

interface SupabaseClientLike {
    auth: {
        getUser(): Promise<{
            data: {
                user:
                    | SupabaseUser
                    | null;
            };
            error:
                | SupabaseError
                | null;
        }>;

        signOut(options?: {
            scope?:
                | "global"
                | "local"
                | "others";
        }): Promise<{
            error:
                | SupabaseError
                | null;
        }>;
    };

    from(table: string): {
        select(
            columns?: string,
            options?: Record<
                string,
                unknown
            >
        ): SupabaseQueryLike;

        insert(
            values: Record<string, unknown>
        ): Promise<{
            error:
                | SupabaseError
                | null;
        }>;

        delete(): SupabaseQueryLike;
    };
}

interface SupabaseQueryLike {
    eq(
        column: string,
        value: unknown
    ): SupabaseQueryLike;

    order(
        column: string,
        options?: {
            ascending?: boolean;
        }
    ): SupabaseQueryLike;

    limit(
        count: number
    ): SupabaseQueryLike;

    maybeSingle(): Promise<{
        data:
            | Profile
            | null;
        error:
            | SupabaseError
            | null;
    }>;

    then:
        Promise<
            | SavedCalculation[]
            | WatchlistItem[]
        >["then"];
}

declare global {
    interface Window {
        supabaseClient:
            SupabaseClientLike;
    }
}

const supabaseClient =
    window.supabaseClient;

const workspaceName =
    document.querySelector<HTMLElement>(
        "#workspace-name"
    );

const workspaceUser =
    document.querySelector<HTMLElement>(
        "#workspace-user"
    );

const workspaceExperience =
    document.querySelector<HTMLElement>(
        "#workspace-experience"
    );

const tradeSetupCount =
    document.querySelector<HTMLElement>(
        "#workspace-trade-setup-count"
    );

const calculationCount =
    document.querySelector<HTMLElement>(
        "#workspace-calculation-count"
    );

const watchlistCount =
    document.querySelector<HTMLElement>(
        "#workspace-watchlist-count"
    );

const tradeSetups =
    document.querySelector<HTMLElement>(
        "#trade-setups"
    );

const savedCalculations =
    document.querySelector<HTMLElement>(
        "#saved-calculations"
    );

const watchlist =
    document.querySelector<HTMLElement>(
        "#watchlist"
    );

const watchlistForm =
    document.querySelector<HTMLFormElement>(
        "#watchlist-form"
    );

const watchlistMessage =
    document.querySelector<HTMLElement>(
        "#watchlist-message"
    );

const logoutButton =
    document.querySelector<HTMLButtonElement>(
        "#logout-button"
    );

let currentUser:
    SupabaseUser | null = null;

const setText = (
    element: HTMLElement | null,
    value: string
): void => {
    if (element) {
        element.textContent =
            value;
    }
};

const formatToolName = (
    value: string
): string => {
    return value
        .replace(
            /[-_]/g,
            " "
        )
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase()
        );
};

const formatDate = (
    value: string
): string => {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Unknown";
    }

    return new Intl.DateTimeFormat(
        undefined,
        {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);
};

const formatValue = (
    value: unknown
): string => {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return new Intl.NumberFormat(
            undefined,
            {
                maximumFractionDigits: 8
            }
        ).format(value);
    }

    if (
        typeof value === "string" &&
        value
    ) {
        return value;
    }

    return "—";
};

const hasValue = (
    value: unknown
): boolean => {
    return (
        value !== undefined &&
        value !== null &&
        value !== ""
    );
};

const toNumber = (
    value: unknown
): number | undefined => {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    if (
        typeof value === "string" &&
        value.trim()
    ) {
        const parsed =
            Number(value);

        return Number.isFinite(
            parsed
        )
            ? parsed
            : undefined;
    }

    return undefined;
};

const toDirection = (
    value: unknown
): TradeContext["direction"] => {
    return value === "long" ||
        value === "short"
        ? value
        : undefined;
};

const getCalculationSummary = (
    calculation: SavedCalculation
): string => {
    const result =
        calculation.result ||
        {};

    switch (
        calculation.tool
    ) {
        case "position-size":
            return [
                `Size ${formatValue(
                    result.positionSize
                )}`,
                `Risk ${formatValue(
                    result.riskAmount
                )}`
            ].join(" · ");

        case "risk-reward":
            return [
                `R:R ${formatValue(
                    result.ratio
                )}`,
                `Risk ${formatValue(
                    result.riskPerUnit
                )}`
            ].join(" · ");

        case "pnl-calculator":
            return [
                `PnL ${formatValue(
                    result.netPnL
                )}`,
                `Return ${formatValue(
                    result.percentageReturn
                )}%`
            ].join(" · ");

        default: {
            const entries =
                Object.entries(
                    result
                );

            if (!entries.length) {
                return "Saved calculation";
            }

            return entries
                .slice(0, 2)
                .map(
                    ([key, value]) =>
                        `${formatToolName(
                            key
                        )} ${formatValue(
                            value
                        )}`
                )
                .join(" · ");
        }
    }
};

const getTradeContextFromCalculation = (
    calculation: SavedCalculation
): TradeContext | null => {
    const inputs =
        calculation.inputs ||
        {};

    if (
        calculation.tool ===
        "position-size"
    ) {
        return {
            symbol:
                hasValue(
                    inputs.symbol
                )
                    ? String(
                          inputs.symbol
                      )
                    : undefined,

            timeframe:
                hasValue(
                    inputs.timeframe
                )
                    ? String(
                          inputs.timeframe
                      )
                    : undefined,

            direction:
                toDirection(
                    inputs.direction
                ),

            accountBalance:
                toNumber(
                    inputs.accountBalance
                ),

            riskPercent:
                toNumber(
                    inputs.riskPercent
                ),

            entryPrice:
                toNumber(
                    inputs.entryPrice
                ),

            stopLoss:
                toNumber(
                    inputs.stopLoss
                ),

            positionSize:
                toNumber(
                    calculation.result
                        ?.positionSize
                )
        };
    }

    if (
        calculation.tool ===
        "risk-reward"
    ) {
        return {
            symbol:
                hasValue(
                    inputs.symbol
                )
                    ? String(
                          inputs.symbol
                      )
                    : undefined,

            timeframe:
                hasValue(
                    inputs.timeframe
                )
                    ? String(
                          inputs.timeframe
                      )
                    : undefined,

            direction:
                toDirection(
                    inputs.direction
                ),

            entryPrice:
                toNumber(
                    inputs.entryPrice
                ),

            stopLoss:
                toNumber(
                    inputs.stopLoss
                ),

            targetPrice:
                toNumber(
                    inputs.target
                )
        };
    }

    if (
        calculation.tool ===
        "pnl-calculator"
    ) {
        return {
            symbol:
                hasValue(
                    inputs.symbol
                )
                    ? String(
                          inputs.symbol
                      )
                    : undefined,

            timeframe:
                hasValue(
                    inputs.timeframe
                )
                    ? String(
                          inputs.timeframe
                      )
                    : undefined,

            direction:
                toDirection(
                    inputs.direction
                ),

            entryPrice:
                toNumber(
                    inputs.entryPrice
                ),

            exitPrice:
                toNumber(
                    inputs.exitPrice
                ),

            positionSize:
                toNumber(
                    inputs.positionSize
                ),

            fees:
                toNumber(
                    inputs.fees
                )
        };
    }

    return null;
};

const getCalculationContinueUrl = (
    calculation: SavedCalculation
): string | null => {
    const inputs =
        calculation.inputs ||
        {};

    if (
        calculation.tool ===
            "position-size" &&
        [
            inputs.direction,
            inputs.accountBalance,
            inputs.riskPercent,
            inputs.entryPrice,
            inputs.stopLoss
        ].every(
            hasValue
        )
    ) {
        return buildTradeContextUrl(
            "position-size.html",
            {
                symbol:
                    hasValue(
                        inputs.symbol
                    )
                        ? String(
                              inputs.symbol
                          )
                        : undefined,

                timeframe:
                    hasValue(
                        inputs.timeframe
                    )
                        ? String(
                              inputs.timeframe
                          )
                        : undefined,

                direction:
                    toDirection(
                        inputs.direction
                    ),

                accountBalance:
                    Number(
                        inputs.accountBalance
                    ),

                riskPercent:
                    Number(
                        inputs.riskPercent
                    ),

                entryPrice:
                    Number(
                        inputs.entryPrice
                    ),

                stopLoss:
                    Number(
                        inputs.stopLoss
                    )
            }
        );
    }

    if (
        calculation.tool ===
            "risk-reward" &&
        [
            inputs.direction,
            inputs.entryPrice,
            inputs.stopLoss,
            inputs.target
        ].every(
            hasValue
        )
    ) {
        return buildTradeContextUrl(
            "risk-reward.html",
            {
                symbol:
                    hasValue(
                        inputs.symbol
                    )
                        ? String(
                              inputs.symbol
                          )
                        : undefined,

                timeframe:
                    hasValue(
                        inputs.timeframe
                    )
                        ? String(
                              inputs.timeframe
                          )
                        : undefined,

                direction:
                    toDirection(
                        inputs.direction
                    ),

                entryPrice:
                    Number(
                        inputs.entryPrice
                    ),

                stopLoss:
                    Number(
                        inputs.stopLoss
                    ),

                targetPrice:
                    Number(
                        inputs.target
                    )
            }
        );
    }

    if (
        calculation.tool ===
            "pnl-calculator" &&
        [
            inputs.symbol,
            inputs.timeframe,
            inputs.direction,
            inputs.entryPrice,
            inputs.exitPrice,
            inputs.positionSize,
            inputs.fees
        ].every(
            hasValue
        )
    ) {
        return buildTradeContextUrl(
            "pnl-calculator.html",
            {
                symbol:
                    String(
                        inputs.symbol
                    ),

                timeframe:
                    String(
                        inputs.timeframe
                    ),

                direction:
                    toDirection(
                        inputs.direction
                    ),

                entryPrice:
                    Number(
                        inputs.entryPrice
                    ),

                exitPrice:
                    Number(
                        inputs.exitPrice
                    ),

                positionSize:
                    Number(
                        inputs.positionSize
                    ),

                fees:
                    Number(
                        inputs.fees
                    )
            }
        );
    }

    return null;
};

const getTradeSetupContext = (
    setup: TradeSetup
): TradeContext => {
    return {
        setupId:
            setup.id,

        symbol:
            setup.symbol ||
            undefined,

        timeframe:
            setup.timeframe ||
            undefined,

        direction:
            setup.direction ||
            undefined,

        entryPrice:
            setup.entryPrice ??
            undefined,

        stopLoss:
            setup.stopLoss ??
            undefined,

        targetPrice:
            setup.targetPrice ??
            undefined,

        accountBalance:
            setup.accountBalance ??
            undefined,

        riskPercent:
            setup.riskPercent ??
            undefined,

        positionSize:
            setup.positionSize ??
            undefined,

        exitPrice:
            setup.exitPrice ??
            undefined,

        fees:
            setup.fees ??
            undefined
    };
};

const getTradeSetupContinueUrl = (
    setup: TradeSetup
): string => {
    return buildTradeContextUrl(
        "position-size.html",
        getTradeSetupContext(
            setup
        )
    );
};

const getTradeSetupSummary = (
    setup: TradeSetup
): string => {
    const parts: string[] =
        [];

    if (setup.symbol) {
        parts.push(
            setup.symbol
        );
    }

    if (setup.direction) {
        parts.push(
            setup.direction ===
                "long"
                ? "Long"
                : "Short"
        );
    }

    if (
        setup.entryPrice !==
        null
    ) {
        parts.push(
            `Entry ${formatValue(
                setup.entryPrice
            )}`
        );
    }

    if (
        setup.stopLoss !==
        null
    ) {
        parts.push(
            `Stop ${formatValue(
                setup.stopLoss
            )}`
        );
    }

    if (
        setup.targetPrice !==
        null
    ) {
        parts.push(
            `Target ${formatValue(
                setup.targetPrice
            )}`
        );
    }

    if (
        setup.positionSize !==
        null
    ) {
        parts.push(
            `Size ${formatValue(
                setup.positionSize
            )}`
        );
    }

    if (!parts.length) {
        return "Setup needs more context.";
    }

    return parts
        .slice(0, 5)
        .join(" · ");
};

const createElement = <
    K extends keyof HTMLElementTagNameMap
>(
    tag: K,
    className?: string
): HTMLElementTagNameMap[K] => {
    const element =
        document.createElement(
            tag
        );

    if (className) {
        element.className =
            className;
    }

    return element;
};

const renderTradeSetups = (
    setups: TradeSetup[]
): void => {
    if (!tradeSetups) {
        return;
    }

    tradeSetups.replaceChildren();

    setText(
        tradeSetupCount,
        String(
            setups.length
        )
    );

    if (!setups.length) {
        const empty =
            createElement(
                "p",
                "empty-state"
            );

        empty.textContent =
            "No trade setups yet. Save a calculation as a setup to keep its trading context together.";

        tradeSetups.appendChild(
            empty
        );

        return;
    }

    setups.forEach(
        (setup) => {
            const row =
                createElement(
                    "article",
                    "saved-calculation"
                );

            const main =
                createElement(
                    "div",
                    "saved-calculation-main"
                );

            const topLine =
                createElement(
                    "div",
                    "saved-calculation-title"
                );

            const title =
                createElement(
                    "strong"
                );

            title.textContent =
                setup.title;

            const date =
                createElement(
                    "span",
                    "saved-calculation-date"
                );

            date.textContent =
                formatDate(
                    setup.updatedAt
                );

            topLine.append(
                title,
                date
            );

            const summary =
                createElement(
                    "span",
                    "saved-calculation-summary"
                );

            summary.textContent =
                getTradeSetupSummary(
                    setup
                );

            main.append(
                topLine,
                summary
            );

            const actions =
                createElement(
                    "div",
                    "saved-calculation-actions"
                );

            const continueLink =
                createElement(
                    "a"
                );

            continueLink.href =
                getTradeSetupContinueUrl(
                    setup
                );

            continueLink.textContent =
                "Continue";

            const deleteButton =
                createElement(
                    "button",
                    "row-action"
                );

            deleteButton.type =
                "button";

            deleteButton.textContent =
                "Delete";

            deleteButton.addEventListener(
                "click",
                () => {
                    void deleteTradeSetupById(
                        setup.id
                    );
                }
            );

            actions.append(
                continueLink,
                deleteButton
            );

            row.append(
                main,
                actions
            );

            tradeSetups.appendChild(
                row
            );
        }
    );
};

const renderSavedCalculations = (
    calculations: SavedCalculation[]
): void => {
    if (!savedCalculations) {
        return;
    }

    savedCalculations.replaceChildren();

    if (!calculations.length) {
        const empty =
            createElement(
                "p",
                "empty-state"
            );

        empty.textContent =
            "No saved calculations yet.";

        savedCalculations.appendChild(
            empty
        );

        return;
    }

    calculations.forEach(
        (calculation) => {
            const row =
                createElement(
                    "article",
                    "saved-calculation"
                );

            const main =
                createElement(
                    "div",
                    "saved-calculation-main"
                );

            const topLine =
                createElement(
                    "div",
                    "saved-calculation-title"
                );

            const title =
                createElement(
                    "strong"
                );

            title.textContent =
                formatToolName(
                    calculation.tool
                );

            const date =
                createElement(
                    "span",
                    "saved-calculation-date"
                );

            date.textContent =
                formatDate(
                    calculation.created_at
                );

            topLine.append(
                title,
                date
            );

            const summary =
                createElement(
                    "span",
                    "saved-calculation-summary"
                );

            summary.textContent =
                getCalculationSummary(
                    calculation
                );

            main.append(
                topLine,
                summary
            );

            const actions =
                createElement(
                    "div",
                    "saved-calculation-actions"
                );

            const continueUrl =
                getCalculationContinueUrl(
                    calculation
                );

            if (continueUrl) {
                const continueLink =
                    createElement(
                        "a"
                    );

                continueLink.href =
                    continueUrl;

                continueLink.textContent =
                    "Continue";

                actions.append(
                    continueLink
                );
            }

            if (
                getTradeContextFromCalculation(
                    calculation
                )
            ) {
                const saveButton =
                    createElement(
                        "button",
                        "row-action"
                    );

                saveButton.type =
                    "button";

                saveButton.textContent =
                    "Save as setup";

                saveButton.addEventListener(
                    "click",
                    () => {
                        void saveCalculationAsSetup(
                            calculation,
                            saveButton
                        );
                    }
                );

                actions.append(
                    saveButton
                );
            }

            const deleteButton =
                createElement(
                    "button",
                    "row-action"
                );

            deleteButton.type =
                "button";

            deleteButton.textContent =
                "Delete";

            deleteButton.dataset.id =
                calculation.id;

            deleteButton.addEventListener(
                "click",
                () => {
                    void deleteCalculation(
                        calculation.id
                    );
                }
            );

            actions.append(
                deleteButton
            );

            row.append(
                main,
                actions
            );

            savedCalculations.appendChild(
                row
            );
        }
    );
};

const renderWatchlist = (
    items: WatchlistItem[]
): void => {
    if (!watchlist) {
        return;
    }

    watchlist.replaceChildren();

    if (!items.length) {
        const empty =
            createElement(
                "p",
                "empty-state"
            );

        empty.textContent =
            "Your watchlist is empty.";

        watchlist.appendChild(
            empty
        );

        return;
    }

    items.forEach(
        (item) => {
            const row =
                createElement(
                    "div",
                    "watchlist-item"
                );

            const identity =
                createElement(
                    "div",
                    "watchlist-identity"
                );

            const symbol =
                createElement(
                    "strong"
                );

            symbol.textContent =
                item.symbol;

            const type =
                createElement(
                    "span"
                );

            type.textContent =
                formatToolName(
                    item.asset_type
                );

            identity.append(
                symbol,
                type
            );

            const actions =
                createElement(
                    "div",
                    "watchlist-actions"
                );

            const marketLink =
                createElement(
                    "a"
                );

            marketLink.href =
                `market.html?symbol=${encodeURIComponent(
                    item.symbol
                )}`;

            marketLink.textContent =
                "Market";

            const removeButton =
                createElement(
                    "button",
                    "row-action"
                );

            removeButton.type =
                "button";

            removeButton.textContent =
                "Remove";

            removeButton.addEventListener(
                "click",
                () => {
                    void removeWatchlistItem(
                        item.id
                    );
                }
            );

            actions.append(
                marketLink,
                removeButton
            );

            row.append(
                identity,
                actions
            );

            watchlist.appendChild(
                row
            );
        }
    );
};

const loadWorkspaceProfile =
    async (
        userId: string
    ): Promise<boolean> => {
        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "profiles"
                )
                .select(
                    "display_name, onboarding_completed, workspace_preferences, experience_level"
                )
                .eq(
                    "id",
                    userId
                )
                .maybeSingle();

        if (error) {
            console.error(
                "Profile lookup error:",
                error
            );

            return false;
        }

        if (
            !data ||
            !data.onboarding_completed
        ) {
            window.location.href =
                "onboarding.html";

            return false;
        }

        setText(
            workspaceName,
            data.display_name ||
                "Trader"
        );

        setText(
            workspaceExperience,
            formatToolName(
                data.experience_level ||
                    "Not set"
            )
        );

        const preferences =
            data.workspace_preferences ||
            {};

        if (
            typeof preferences.density ===
            "string"
        ) {
            document.body.dataset.workspaceDensity =
                preferences.density;
        }

        return true;
    };

const loadSavedCalculations =
    async (
        userId: string
    ): Promise<void> => {
        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "saved_calculations"
                )
                .select(
                    "id, tool, inputs, result, created_at"
                )
                .eq(
                    "user_id",
                    userId
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                )
                .limit(5);

        if (error) {
            console.error(
                "Saved calculations error:",
                error
            );

            if (
                savedCalculations
            ) {
                savedCalculations.replaceChildren();

                const errorState =
                    createElement(
                        "p",
                        "empty-state"
                    );

                errorState.textContent =
                    "Unable to load saved calculations.";

                savedCalculations.appendChild(
                    errorState
                );
            }

            return;
        }

        renderSavedCalculations(
            data as SavedCalculation[]
        );
    };

const loadTradeSetups =
    async (): Promise<void> => {
        try {
            const setups =
                await getTradeSetups(
                    8
                );

            renderTradeSetups(
                setups
            );
        } catch (error) {
            console.error(
                "Trade setups error:",
                error
            );

            setText(
                tradeSetupCount,
                "—"
            );

            if (
                tradeSetups
            ) {
                tradeSetups.replaceChildren();

                const errorState =
                    createElement(
                        "p",
                        "empty-state"
                    );

                errorState.textContent =
                    "Unable to load trade setups.";

                tradeSetups.appendChild(
                    errorState
                );
            }
        }
    };

const loadWatchlist =
    async (
        userId: string
    ): Promise<void> => {
        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "watchlist_items"
                )
                .select(
                    "id, symbol, asset_type, created_at"
                )
                .eq(
                    "user_id",
                    userId
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );

        if (error) {
            console.error(
                "Watchlist error:",
                error
            );

            if (watchlist) {
                watchlist.replaceChildren();

                const errorState =
                    createElement(
                        "p",
                        "empty-state"
                    );

                errorState.textContent =
                    "Unable to load watchlist.";

                watchlist.appendChild(
                    errorState
                );
            }

            return;
        }

        renderWatchlist(
            data as WatchlistItem[]
        );
    };

const loadWorkspaceStats =
    async (
        userId: string
    ): Promise<void> => {
        const [
            calculations,
            watchlistItems
        ] =
            await Promise.all([
                supabaseClient
                    .from(
                        "saved_calculations"
                    )
                    .select(
                        "id",
                        {
                            count:
                                "exact",
                            head: true
                        }
                    )
                    .eq(
                        "user_id",
                        userId
                    ),

                supabaseClient
                    .from(
                        "watchlist_items"
                    )
                    .select(
                        "id",
                        {
                            count:
                                "exact",
                            head: true
                        }
                    )
                    .eq(
                        "user_id",
                        userId
                    )
            ]);

        if (
            !calculations.error
        ) {
            setText(
                calculationCount,
                String(
                    calculations.count ||
                        0
                )
            );
        }

        if (
            !watchlistItems.error
        ) {
            setText(
                watchlistCount,
                String(
                    watchlistItems.count ||
                        0
                )
            );
        }
    };

const saveCalculationAsSetup =
    async (
        calculation:
            SavedCalculation,
        button:
            HTMLButtonElement
    ): Promise<void> => {
        const context =
            getTradeContextFromCalculation(
                calculation
            );

        if (!context) {
            return;
        }

        button.disabled = true;
        button.textContent =
            "Saving...";

        const symbol =
            context.symbol;

        const toolName =
            formatToolName(
                calculation.tool
            );

        const title =
            symbol
                ? `${symbol} · ${toolName}`
                : `${toolName} setup`;

        try {
            await createTradeSetup({
                title,
                context
            });

            button.textContent =
                "Saved";

            await loadTradeSetups();
        } catch (error) {
            console.error(
                "Save trade setup error:",
                error
            );

            button.disabled =
                false;

            button.textContent =
                "Save as setup";
        }
    };

const deleteTradeSetupById =
    async (
        id: string
    ): Promise<void> => {
        try {
            await deleteTradeSetup(
                id
            );

            await loadTradeSetups();
        } catch (error) {
            console.error(
                "Delete trade setup error:",
                error
            );
        }
    };

const addWatchlistItem =
    async (
        event: SubmitEvent
    ): Promise<void> => {
        event.preventDefault();

        if (!currentUser) {
            return;
        }

        const symbolInput =
            document.querySelector<HTMLInputElement>(
                "#watchlist-symbol"
            );

        const typeInput =
            document.querySelector<HTMLSelectElement>(
                "#watchlist-type"
            );

        const symbol =
            symbolInput?.value
                .trim()
                .toUpperCase() ||
            "";

        const assetType =
            typeInput?.value ||
            "crypto";

        if (!symbol) {
            return;
        }

        setText(
            watchlistMessage,
            "Adding..."
        );

        const {
            error
        } =
            await supabaseClient
                .from(
                    "watchlist_items"
                )
                .insert({
                    user_id:
                        currentUser.id,
                    symbol,
                    asset_type:
                        assetType
                });

        if (error) {
            if (
                error.code ===
                "23505"
            ) {
                setText(
                    watchlistMessage,
                    "That symbol is already on your watchlist."
                );
            } else {
                console.error(
                    "Add watchlist error:",
                    error
                );

                setText(
                    watchlistMessage,
                    "Unable to add that symbol."
                );
            }

            return;
        }

        if (symbolInput) {
            symbolInput.value =
                "";
        }

        setText(
            watchlistMessage,
            "Added."
        );

        await Promise.all([
            loadWatchlist(
                currentUser.id
            ),
            loadWorkspaceStats(
                currentUser.id
            )
        ]);
    };

const removeWatchlistItem =
    async (
        id: string
    ): Promise<void> => {
        if (!currentUser) {
            return;
        }

        const {
            error
        } =
            await supabaseClient
                .from(
                    "watchlist_items"
                )
                .delete()
                .eq(
                    "id",
                    id
                );

        if (error) {
            console.error(
                "Remove watchlist error:",
                error
            );

            return;
        }

        await Promise.all([
            loadWatchlist(
                currentUser.id
            ),
            loadWorkspaceStats(
                currentUser.id
            )
        ]);
    };

const deleteCalculation =
    async (
        id: string
    ): Promise<void> => {
        if (!currentUser) {
            return;
        }

        const button =
            savedCalculations?.querySelector<HTMLButtonElement>(
                `.row-action[data-id="${CSS.escape(
                    id
                )}"]`
            );

        if (button) {
            button.disabled =
                true;

            button.textContent =
                "Deleting...";
        }

        const {
            error
        } =
            await supabaseClient
                .from(
                    "saved_calculations"
                )
                .delete()
                .eq(
                    "id",
                    id
                );

        if (error) {
            console.error(
                "Delete calculation error:",
                error
            );

            if (button) {
                button.disabled =
                    false;

                button.textContent =
                    "Delete";
            }

            return;
        }

        await Promise.all([
            loadSavedCalculations(
                currentUser.id
            ),
            loadWorkspaceStats(
                currentUser.id
            )
        ]);
    };

const logout =
    async (): Promise<void> => {
        if (!logoutButton) {
            return;
        }

        logoutButton.disabled =
            true;

        logoutButton.textContent =
            "Signing out...";

        const {
            error
        } =
            await supabaseClient
                .auth
                .signOut({
                    scope: "local"
                });

        if (error) {
            console.error(
                "Logout error:",
                error
            );

            logoutButton.disabled =
                false;

            logoutButton.textContent =
                "Sign out";

            return;
        }

        window.location.href =
            "login.html";
    };

const loadWorkspace =
    async (): Promise<void> => {
        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .getUser();

        if (
            error ||
            !data.user
        ) {
            window.location.href =
                "login.html";

            return;
        }

        currentUser =
            data.user;

        setText(
            workspaceUser,
            data.user.email ||
                "Signed in"
        );

        const loaded =
            await loadWorkspaceProfile(
                data.user.id
            );

        if (!loaded) {
            return;
        }

        await Promise.all([
            loadTradeSetups(),
            loadSavedCalculations(
                data.user.id
            ),
            loadWatchlist(
                data.user.id
            ),
            loadWorkspaceStats(
                data.user.id
            )
        ]);
    };

watchlistForm?.addEventListener(
    "submit",
    (event) => {
        void addWatchlistItem(
            event
        );
    }
);

logoutButton?.addEventListener(
    "click",
    () => {
        void logout();
    }
);

mountMarketStrip();

void loadWorkspace();