export type TradeDirection =
    | "long"
    | "short";

export interface TradeContext {
    symbol?: string;
    timeframe?: string;
    direction?: TradeDirection;
    entryPrice?: number;
    stopLoss?: number;
    targetPrice?: number;
    accountBalance?: number;
    riskPercent?: number;
    positionSize?: number;
    exitPrice?: number;
    fees?: number;
}

const NUMERIC_FIELDS: Array<keyof TradeContext> = [
    "entryPrice",
    "stopLoss",
    "targetPrice",
    "accountBalance",
    "riskPercent",
    "positionSize",
    "exitPrice",
    "fees"
];

const readNumberParam = (
    params: URLSearchParams,
    key: string
): number | undefined => {
    const value = params.get(key);

    if (value === null || value.trim() === "") {
        return undefined;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : undefined;
};

export const readTradeContextFromUrl = (
    search: string = window.location.search
): TradeContext => {
    const params = new URLSearchParams(search);
    const context: TradeContext = {};

    const symbol = params.get("symbol")?.trim();
    const timeframe = params.get("timeframe")?.trim();
    const direction = params.get("direction");

    if (symbol) {
        context.symbol = symbol;
    }

    if (timeframe) {
        context.timeframe = timeframe;
    }

    if (
        direction === "long" ||
        direction === "short"
    ) {
        context.direction = direction;
    }

    NUMERIC_FIELDS.forEach((field) => {
        const value = readNumberParam(
            params,
            field
        );

        if (value !== undefined) {
            context[field] = value;
        }
    });

    return context;
};

export const buildTradeContextQuery = (
    context: TradeContext
): string => {
    const params = new URLSearchParams();

    if (context.symbol?.trim()) {
        params.set(
            "symbol",
            context.symbol.trim()
        );
    }

    if (context.timeframe?.trim()) {
        params.set(
            "timeframe",
            context.timeframe.trim()
        );
    }

    if (
        context.direction === "long" ||
        context.direction === "short"
    ) {
        params.set(
            "direction",
            context.direction
        );
    }

    NUMERIC_FIELDS.forEach((field) => {
        const value = context[field];

        if (
            typeof value === "number" &&
            Number.isFinite(value)
        ) {
            params.set(
                field,
                String(value)
            );
        }
    });

    return params.toString();
};

export const buildTradeContextUrl = (
    path: string,
    context: TradeContext
): string => {
    const query =
        buildTradeContextQuery(context);

    return query
        ? `${path}?${query}`
        : path;
};