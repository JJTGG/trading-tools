import { supabaseClient } from "../data/supabase";

export interface AuthorizationState {
    roles: string[];
    permissions: Set<string>;
}

export const loadAuthorization =
    async (
        userId: string
    ): Promise<AuthorizationState> => {
        const {
            data: roleRows,
            error: roleError
        } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);

        if (roleError) {
            throw roleError;
        }

        const roles = Array.from(
            new Set(
                (roleRows || [])
                    .map(
                        (row) =>
                            String(
                                row.role
                            )
                    )
            )
        );

        if (!roles.length) {
            return {
                roles: [],
                permissions: new Set()
            };
        }

        const {
            data: permissionRows,
            error: permissionError
        } = await supabaseClient
            .from("role_permissions")
            .select("role, permission");

        if (permissionError) {
            throw permissionError;
        }

        const roleSet =
            new Set(roles);

        const permissions =
            new Set<string>();

        (
            permissionRows || []
        ).forEach(
            (row) => {
                const role =
                    String(
                        row.role
                    );

                if (
                    roleSet.has(
                        role
                    )
                ) {
                    permissions.add(
                        String(
                            row.permission
                        )
                    );
                }
            }
        );

        if (
            permissions.has(
                "system.full_control"
            )
        ) {
            const {
                data:
                    allPermissionRows,
                error:
                    allPermissionError
            } =
                await supabaseClient
                    .from(
                        "permissions"
                    )
                    .select(
                        "permission"
                    );

            if (allPermissionError) {
                throw allPermissionError;
            }

            (
                allPermissionRows ||
                []
            ).forEach(
                (row) => {
                    permissions.add(
                        String(
                            row.permission
                        )
                    );
                }
            );
        }

        return {
            roles,
            permissions
        };
    };

export const hasPermission =
    (
        authorization: AuthorizationState,
        permission: string
    ): boolean => {
        return (
            authorization.permissions.has(
                "system.full_control"
            ) ||
            authorization.permissions.has(
                permission
            )
        );
    };

export const hasAnyPermission =
    (
        authorization: AuthorizationState,
        permissions: string[]
    ): boolean => {
        return permissions.some(
            (permission) =>
                hasPermission(
                    authorization,
                    permission
                )
        );
    };