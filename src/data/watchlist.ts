interface SupabaseError {
    message: string;
}

interface SupabaseUser {
    id: string;
    email?: string;
}

interface SupabaseClientLike {
    auth: {
        getUser(): Promise<{
            data: {
                user: SupabaseUser | null;
            };
            error: SupabaseError | null;
        }>;
    };
    from(table: string): {
        select(columns: string): {
            order(
                column: string,
                options: {
                    ascending: boolean;
                }
            ): Promise<{
                data: WatchlistItem[] | null;
                error: SupabaseError | null;
            }>;
        };
    };
}

export interface WatchlistItem {
    symbol: string;
    asset_type: string;
}

declare const supabaseClient: SupabaseClientLike;

const normalizeSymbol = (
    symbol: string,
    assetType: string
): string => {
    const normalized =
        symbol
            .trim()
            .toUpperCase();

    if (!normalized) {
        return "";
    }

    if (assetType === "crypto") {
        return normalized.includes("/")
            ? normalized
            : `${normalized}/USD`;
    }

    if (assetType === "forex") {
        if (normalized.includes("/")) {
            return normalized;
        }

        if (
            normalized.length === 6 &&
            /^[A-Z]+$/.test(normalized)
        ) {
            return `${normalized.slice(0, 3)}/${normalized.slice(3)}`;
        }
    }

    return normalized;
};

export async function getWatchlistSymbols(
    limit = 3
): Promise<string[]> {
    try {
        const {
            data: { user },
            error: userError
        } =
            await supabaseClient.auth.getUser();

        if (
            userError ||
            !user
        ) {
            return [];
        }

        const {
            data,
            error
        } =
            await supabaseClient
                .from("watchlist_items")
                .select("symbol, asset_type")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (
            error ||
            !data?.length
        ) {
            return [];
        }

        const symbols =
            data
                .map(
                    (item) =>
                        normalizeSymbol(
                            item.symbol,
                            item.asset_type
                        )
                )
                .filter(Boolean);

        return [
            ...new Set(symbols)
        ].slice(0, limit);
    } catch {
        return [];
    }
}