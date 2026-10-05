interface SupabaseError {
    message: string;
    code?: string;
    status?: number;
}

export interface AuthUser {
    id: string;
    email?: string;
}

export interface UserProfile {
    display_name: string | null;
    preferred_currency: string | null;
    markets_traded: string[] | null;
    experience_level: string | null;
    workspace_preferences:
        | Record<string, unknown>
        | null;
    onboarding_completed: boolean;
}

export type ProfileUpdates =
    Partial<{
        display_name: string;
        preferred_currency: string;
        markets_traded: string[];
        experience_level: string;
        workspace_preferences:
            Record<string, unknown>;
        onboarding_completed: boolean;
    }>;

interface ProfileQuery {
    maybeSingle(): Promise<{
        data: UserProfile | null;
        error: SupabaseError | null;
    }>;
}

interface ProfileUpdateQuery {
    eq(
        column: string,
        value: unknown
    ): {
        select(
            columns?: string
        ): ProfileQuery;
    };
}

interface SupabaseClientLike {
    auth: {
        getUser(): Promise<{
            data: {
                user: AuthUser | null;
            };
            error: SupabaseError | null;
        }>;

        signInWithPassword(values: {
            email: string;
            password: string;
        }): Promise<{
            data: {
                user: AuthUser | null;
                session: unknown | null;
            };
            error: SupabaseError | null;
        }>;

        signUp(values: {
            email: string;
            password: string;
            options?: {
                emailRedirectTo?: string;
                data?: Record<
                    string,
                    string | boolean | null
                >;
            };
        }): Promise<{
            data: {
                user: AuthUser | null;
                session: unknown | null;
            };
            error: SupabaseError | null;
        }>;

        signOut(options?: {
            scope?: "global" | "local" | "others";
        }): Promise<{
            error: SupabaseError | null;
        }>;
    };

    from(table: string): {
        select(columns?: string): {
            eq(
                column: string,
                value: unknown
            ): ProfileQuery;
        };

        update(
            values: ProfileUpdates
        ): ProfileUpdateQuery;
    };
}

declare global {
    interface Window {
        supabaseClient?: SupabaseClientLike;
    }
}

export const getClient =
    (): SupabaseClientLike => {
        const client =
            window.supabaseClient;

        if (!client) {
            throw new Error(
                "Supabase client is unavailable."
            );
        }

        return client;
    };

export const getCurrentUser =
    async (): Promise<AuthUser | null> => {
        const {
            data,
            error
        } =
            await getClient()
                .auth
                .getUser();

        if (error) {
            throw error;
        }

        return data.user;
    };

export const getUserProfile =
    async (
        userId: string
    ): Promise<UserProfile | null> => {
        const {
            data,
            error
        } =
            await getClient()
                .from("profiles")
                .select(
                    [
                        "display_name",
                        "preferred_currency",
                        "markets_traded",
                        "experience_level",
                        "workspace_preferences",
                        "onboarding_completed"
                    ].join(", ")
                )
                .eq(
                    "id",
                    userId
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    };

export const updateUserProfile =
    async (
        userId: string,
        updates: ProfileUpdates
    ): Promise<void> => {
        const {
            data,
            error
        } =
            await getClient()
                .from("profiles")
                .update(updates)
                .eq(
                    "id",
                    userId
                )
                .select("id")
                .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error(
                "Your profile could not be updated."
            );
        }
    };

const getSafeNext = (
    value: string | null
): string => {
    if (!value) {
        return "workspace.html";
    }

    try {
        const url =
            new URL(
                value,
                window.location.origin
            );

        if (
            url.origin !==
            window.location.origin
        ) {
            return "workspace.html";
        }

        const allowedPages =
            new Set([
                "workspace.html",
                "settings.html",
                "preferences.html",
                "billing.html",
                "onboarding.html",
                "tools.html"
            ]);

        const filename =
            url.pathname
                .split("/")
                .filter(Boolean)
                .pop();

        if (
            !filename ||
            !allowedPages.has(filename)
        ) {
            return "workspace.html";
        }

        return [
            filename,
            url.search,
            url.hash
        ].join("");
    } catch {
        return "workspace.html";
    }
};

const getDefaultLandingPage = (
    profile: UserProfile
): string => {
    const defaultPage =
        profile.workspace_preferences &&
        typeof profile.workspace_preferences.default_page ===
            "string"
            ? profile.workspace_preferences.default_page
            : "workspace";

    return defaultPage === "tools"
        ? "tools.html"
        : "workspace.html";
};

export const currentPageDestination =
    (): string => {
        const pathname =
            window.location.pathname;

        const filename =
            pathname
                .split("/")
                .filter(Boolean)
                .pop() ||
            "index.html";

        return [
            filename,
            window.location.search,
            window.location.hash
        ].join("");
    };

export const redirectToLogin =
    (): void => {
        const next =
            encodeURIComponent(
                currentPageDestination()
            );

        window.location.href =
            `login.html?next=${next}`;
    };

export const redirectAfterAuthentication =
    async (): Promise<void> => {
        const user =
            await getCurrentUser();

        if (!user) {
            return;
        }

        const profile =
            await getUserProfile(
                user.id
            );

        const params =
            new URLSearchParams(
                window.location.search
            );

        if (
            !profile ||
            !profile.onboarding_completed
        ) {
            window.location.href =
                "onboarding.html";

            return;
        }

        const requestedNext =
            params.get("next");

        window.location.href =
            requestedNext
                ? getSafeNext(
                    requestedNext
                )
                : getDefaultLandingPage(
                    profile
                );
    };

export const requireWorkspaceProfile =
    async (): Promise<{
        user: AuthUser;
        profile: UserProfile;
    } | null> => {
        let user: AuthUser | null;

        try {
            user =
                await getCurrentUser();
        } catch (error) {
            console.error(
                "Authentication check failed:",
                error
            );

            redirectToLogin();

            return null;
        }

        if (!user) {
            redirectToLogin();

            return null;
        }

        let profile:
            | UserProfile
            | null;

        try {
            profile =
                await getUserProfile(
                    user.id
                );
        } catch (error) {
            console.error(
                "Profile lookup failed:",
                error
            );

            return null;
        }

        if (
            !profile ||
            !profile.onboarding_completed
        ) {
            window.location.href =
                "onboarding.html";

            return null;
        }

        return {
            user,
            profile
        };
    };

export const requireOnboarding =
    async (): Promise<{
        user: AuthUser;
        profile: UserProfile | null;
    } | null> => {
        let user: AuthUser | null;

        try {
            user =
                await getCurrentUser();
        } catch (error) {
            console.error(
                "Authentication check failed:",
                error
            );

            redirectToLogin();

            return null;
        }

        if (!user) {
            redirectToLogin();

            return null;
        }

        let profile:
            | UserProfile
            | null;

        try {
            profile =
                await getUserProfile(
                    user.id
                );
        } catch (error) {
            console.error(
                "Profile lookup failed:",
                error
            );

            return null;
        }

        if (
            profile?.onboarding_completed
        ) {
            window.location.href =
                "workspace.html";

            return null;
        }

        return {
            user,
            profile
        };
    };

export const requireAccountProfile =
    async (): Promise<{
        user: AuthUser;
        profile: UserProfile;
    } | null> => {
        return requireWorkspaceProfile();
    };