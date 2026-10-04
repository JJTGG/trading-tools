import { getClient } from "../auth/runtime";

import type {
    TradeContext,
    TradeDirection
} from "./trade-context";

export interface TradeSetup {
    id: string;
    userId: string;
    title: string;
    symbol: string | null;
    timeframe: string | null;
    direction: TradeDirection | null;
    entryPrice: number | null;
    stopLoss: number | null;
    targetPrice: number | null;
    accountBalance: number | null;
    riskPercent: number | null;
    positionSize: number | null;
    exitPrice: number | null;
    fees: number | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTradeSetupInput {
    title?: string;
    context?: TradeContext;
    notes?: string;
}

export interface UpdateTradeSetupInput {
    title?: string;
    context?: TradeContext;
    notes?: string | null;
}

export interface SaveTradeSetupInput {
    id?: string;
    title?: string;
    context?: TradeContext;
    notes?: string | null;
}

interface TradeSetupRow {
    id: string;
    user_id: string;
    title: string;
    symbol: string | null;
    timeframe: string | null;
    direction: TradeDirection | null;
    entry_price:
        | string
        | number
        | null;
    stop_loss:
        | string
        | number
        | null;
    target_price:
        | string
        | number
        | null;
    account_balance:
        | string
        | number
        | null;
    risk_percent:
        | string
        | number
        | null;
    position_size:
        | string
        | number
        | null;
    exit_price:
        | string
        | number
        | null;
    fees:
        | string
        | number
        | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

const toNullableNumber = (
    value:
        | string
        | number
        | null
): number | null => {
    if (value === null) {
        return null;
    }

    const parsed =
        typeof value === "number"
            ? value
            : Number(value);

    return Number.isFinite(
        parsed
    )
        ? parsed
        : null;
};

const mapTradeSetup = (
    row: TradeSetupRow
): TradeSetup => {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        symbol: row.symbol,
        timeframe: row.timeframe,
        direction: row.direction,

        entryPrice:
            toNullableNumber(
                row.entry_price
            ),

        stopLoss:
            toNullableNumber(
                row.stop_loss
            ),

        targetPrice:
            toNullableNumber(
                row.target_price
            ),

        accountBalance:
            toNullableNumber(
                row.account_balance
            ),

        riskPercent:
            toNullableNumber(
                row.risk_percent
            ),

        positionSize:
            toNullableNumber(
                row.position_size
            ),

        exitPrice:
            toNullableNumber(
                row.exit_price
            ),

        fees:
            toNullableNumber(
                row.fees
            ),

        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const contextToInsertRow = (
    context: TradeContext = {}
): Record<string, unknown> => {
    return {
        symbol:
            context.symbol ??
            null,

        timeframe:
            context.timeframe ??
            null,

        direction:
            context.direction ??
            null,

        entry_price:
            context.entryPrice ??
            null,

        stop_loss:
            context.stopLoss ??
            null,

        target_price:
            context.targetPrice ??
            null,

        account_balance:
            context.accountBalance ??
            null,

        risk_percent:
            context.riskPercent ??
            null,

        position_size:
            context.positionSize ??
            null,

        exit_price:
            context.exitPrice ??
            null,

        fees:
            context.fees ??
            null
    };
};

const contextToUpdateRow = (
    context: TradeContext
): Record<string, unknown> => {
    const updates:
        Record<string, unknown> = {};

    if (
        context.symbol !==
        undefined
    ) {
        updates.symbol =
            context.symbol;
    }

    if (
        context.timeframe !==
        undefined
    ) {
        updates.timeframe =
            context.timeframe;
    }

    if (
        context.direction !==
        undefined
    ) {
        updates.direction =
            context.direction;
    }

    if (
        context.entryPrice !==
        undefined
    ) {
        updates.entry_price =
            context.entryPrice;
    }

    if (
        context.stopLoss !==
        undefined
    ) {
        updates.stop_loss =
            context.stopLoss;
    }

    if (
        context.targetPrice !==
        undefined
    ) {
        updates.target_price =
            context.targetPrice;
    }

    if (
        context.accountBalance !==
        undefined
    ) {
        updates.account_balance =
            context.accountBalance;
    }

    if (
        context.riskPercent !==
        undefined
    ) {
        updates.risk_percent =
            context.riskPercent;
    }

    if (
        context.positionSize !==
        undefined
    ) {
        updates.position_size =
            context.positionSize;
    }

    if (
        context.exitPrice !==
        undefined
    ) {
        updates.exit_price =
            context.exitPrice;
    }

    if (
        context.fees !==
        undefined
    ) {
        updates.fees =
            context.fees;
    }

    return updates;
};

const selectColumns = [
    "id",
    "user_id",
    "title",
    "symbol",
    "timeframe",
    "direction",
    "entry_price",
    "stop_loss",
    "target_price",
    "account_balance",
    "risk_percent",
    "position_size",
    "exit_price",
    "fees",
    "notes",
    "created_at",
    "updated_at"
].join(", ");

export const createTradeSetup =
    async (
        input: CreateTradeSetupInput = {}
    ): Promise<TradeSetup> => {
        const client =
            getClient();

        const {
            data: {
                user
            },
            error: userError
        } =
            await client.auth.getUser();

        if (userError) {
            throw userError;
        }

        if (!user) {
            throw new Error(
                "You must be signed in to create a trade setup."
            );
        }

        const {
            data,
            error
        } =
            await client
                .from(
                    "trade_setups"
                )
                .insert({
                    user_id:
                        user.id,

                    title:
                        input.title?.trim() ||
                        "Untitled setup",

                    ...contextToInsertRow(
                        input.context
                    ),

                    notes:
                        input.notes?.trim() ||
                        null
                })
                .select(
                    selectColumns
                )
                .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error(
                "The trade setup could not be created."
            );
        }

        return mapTradeSetup(
            data as TradeSetupRow
        );
    };

export const getTradeSetups =
    async (
        limit?: number
    ): Promise<TradeSetup[]> => {
        const client =
            getClient();

        let query =
            client
                .from(
                    "trade_setups"
                )
                .select(
                    selectColumns
                )
                .order(
                    "updated_at",
                    {
                        ascending:
                            false
                    }
                );

        if (
            typeof limit ===
                "number" &&
            Number.isFinite(
                limit
            ) &&
            limit > 0
        ) {
            query =
                query.limit(
                    Math.floor(
                        limit
                    )
                );
        }

        const {
            data,
            error
        } =
            await query;

        if (error) {
            throw error;
        }

        return (
            (data ||
                []) as TradeSetupRow[]
        ).map(
            mapTradeSetup
        );
    };

export const getTradeSetup =
    async (
        id: string
    ): Promise<
        TradeSetup | null
    > => {
        const client =
            getClient();

        const {
            data,
            error
        } =
            await client
                .from(
                    "trade_setups"
                )
                .select(
                    selectColumns
                )
                .eq(
                    "id",
                    id
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return null;
        }

        return mapTradeSetup(
            data as TradeSetupRow
        );
    };

export const updateTradeSetup =
    async (
        id: string,
        input: UpdateTradeSetupInput
    ): Promise<TradeSetup> => {
        const client =
            getClient();

        const updates:
            Record<string, unknown> = {};

        if (
            input.title !==
            undefined
        ) {
            updates.title =
                input.title.trim() ||
                "Untitled setup";
        }

        if (
            input.context !==
            undefined
        ) {
            Object.assign(
                updates,
                contextToUpdateRow(
                    input.context
                )
            );
        }

        if (
            input.notes !==
            undefined
        ) {
            updates.notes =
                input.notes?.trim() ||
                null;
        }

        updates.updated_at =
            new Date().toISOString();

        const {
            data,
            error
        } =
            await client
                .from(
                    "trade_setups"
                )
                .update(
                    updates
                )
                .eq(
                    "id",
                    id
                )
                .select(
                    selectColumns
                )
                .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error(
                "The trade setup could not be updated."
            );
        }

        return mapTradeSetup(
            data as TradeSetupRow
        );
    };

export const saveTradeSetup =
    async (
        input: SaveTradeSetupInput
    ): Promise<TradeSetup> => {
        if (input.id) {
            return updateTradeSetup(
                input.id,
                {
                    title:
                        input.title,
                    context:
                        input.context,
                    notes:
                        input.notes
                }
            );
        }

        return createTradeSetup({
            title:
                input.title,

            context:
                input.context,

            notes:
                input.notes ?? undefined
        });
    };

export const deleteTradeSetup =
    async (
        id: string
    ): Promise<void> => {
        const client =
            getClient();

        const {
            error
        } =
            await client
                .from(
                    "trade_setups"
                )
                .delete()
                .eq(
                    "id",
                    id
                );

        if (error) {
            throw error;
        }
    };