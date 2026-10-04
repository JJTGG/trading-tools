import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/app-shell.css";
import "./admin.css";

import {
    getCurrentUser,
    redirectToLogin
} from "../auth/runtime";

import {
    loadAuthorization,
    hasPermission,
    type AuthorizationState
} from "../auth/authorization";

import { supabaseClient } from "../data/supabase";

type AppRole =
    | "owner"
    | "administrator"
    | "moderator"
    | "editor"
    | "support_human"
    | "support_ai"
    | "user";

interface RoleRecord {
    role: AppRole;
    name: string;
    description: string;
}

interface RolePermissionRecord {
    role: AppRole;
    permission: string;
}

interface DirectoryUser {
    user_id: string;
    email: string | null;
    display_name: string | null;
    roles: AppRole[];
    created_at: string;
}

interface AdminPanelDefinition {
    id: string;
    label: string;
    description: string;
    permission?: string;
}

const panelDefinitions:
    AdminPanelDefinition[] = [
        {
            id: "roles",
            label: "Staff & Roles",
            description:
                "Manage staff assignments and inspect the platform role model.",
            permission:
                "staff.manage"
        },
        {
            id: "users",
            label: "Users",
            description:
                "Review platform user accounts and their assigned roles.",
            permission:
                "users.view"
        },
        {
            id: "tools",
            label: "Tools",
            description:
                "Manage the Trading Tools product surface.",
            permission:
                "tools.manage"
        },
        {
            id: "analytics",
            label: "Analytics",
            description:
                "Review first-party product usage and platform analytics.",
            permission:
                "analytics.view"
        },
        {
            id: "audit",
            label: "Audit",
            description:
                "Review administrative and security audit information.",
            permission:
                "audit.view"
        },
        {
            id: "support",
            label: "Support",
            description:
                "Manage support operations and escalations.",
            permission:
                "support.tickets"
        },
        {
            id: "settings",
            label: "Platform Settings",
            description:
                "Manage system-level platform configuration.",
            permission:
                "platform.settings"
        },
        {
            id: "monetization",
            label: "Monetization",
            description:
                "Manage future monetization and commercial controls.",
            permission:
                "monetization.manage"
        },
        {
            id: "content",
            label: "Content",
            description:
                "Manage educational and product content.",
            permission:
                "content.manage"
        },
        {
            id: "authentication",
            label: "Authentication",
            description:
                "Manage platform authentication controls.",
            permission:
                "auth.manage"
        }
    ];

const accessState =
    document.querySelector<HTMLElement>(
        "#admin-access-state"
    );

const roleValue =
    document.querySelector<HTMLElement>(
        "#admin-role"
    );

const permissionCount =
    document.querySelector<HTMLElement>(
        "#admin-permission-count"
    );

const accessMode =
    document.querySelector<HTMLElement>(
        "#admin-access-mode"
    );

const panelCount =
    document.querySelector<HTMLElement>(
        "#admin-panel-count"
    );

const panelList =
    document.querySelector<HTMLElement>(
        "#admin-panel-list"
    );

const panelView =
    document.querySelector<HTMLElement>(
        "#admin-panel-view"
    );

const setText = (
    element: HTMLElement | null,
    value: string
): void => {
    if (element) {
        element.textContent =
            value;
    }
};

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

const formatRole =
    (role: string): string =>
        role
            .replace(
                /_/g,
                " "
            )
            .replace(
                /\b\w/g,
                (character) =>
                    character.toUpperCase()
            );

const renderError = (
    message: string
): void => {
    if (!panelView) {
        return;
    }

    panelView.hidden =
        false;

    panelView.replaceChildren();

    const error =
        createElement(
            "p",
            "admin-error"
        );

    error.textContent =
        message;

    panelView.appendChild(
        error
    );
};

const renderRoleMatrix = async (
    container: HTMLElement
): Promise<void> => {
    const loading =
        createElement(
            "p",
            "admin-loading"
        );

    loading.textContent =
        "Loading role matrix…";

    container.appendChild(
        loading
    );

    const [
        rolesResult,
        permissionsResult
    ] = await Promise.all([
        supabaseClient
            .from("roles")
            .select(
                "role, name, description"
            )
            .order(
                "role"
            ),

        supabaseClient
            .from("role_permissions")
            .select(
                "role, permission"
            )
    ]);

    loading.remove();

    if (
        rolesResult.error ||
        permissionsResult.error
    ) {
        console.error(
            "Role matrix load error:",
            rolesResult.error ||
                permissionsResult.error
        );

        const error =
            createElement(
                "p",
                "admin-error"
            );

        error.textContent =
            "Unable to load the role matrix.";

        container.appendChild(
            error
        );

        return;
    }

    const roles =
        (rolesResult.data ||
            []) as RoleRecord[];

    const permissions =
        (permissionsResult.data ||
            []) as RolePermissionRecord[];

    const matrix =
        createElement(
            "div",
            "admin-role-matrix"
        );

    roles.forEach(
        (role) => {
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
                role.name;

            const code =
                createElement(
                    "span",
                    "admin-role-code"
                );

            code.textContent =
                role.role;

            header.append(
                name,
                code
            );

            const description =
                createElement(
                    "p"
                );

            description.textContent =
                role.description;

            const permissionList =
                createElement(
                    "div",
                    "admin-permission-list"
                );

            const rolePermissions =
                permissions
                    .filter(
                        (item) =>
                            item.role ===
                            role.role
                    )
                    .map(
                        (item) =>
                            item.permission
                    )
                    .sort();

            if (
                !rolePermissions.length
            ) {
                const empty =
                    createElement(
                        "span",
                        "admin-permission-empty"
                    );

                empty.textContent =
                    "No assigned permissions.";

                permissionList.appendChild(
                    empty
                );
            }

            rolePermissions.forEach(
                (permission) => {
                    const item =
                        createElement(
                            "span",
                            "admin-permission"
                        );

                    item.textContent =
                        permission;

                    permissionList.appendChild(
                        item
                    );
                }
            );

            card.append(
                header,
                description,
                permissionList
            );

            matrix.appendChild(
                card
            );
        }
    );

    container.appendChild(
        matrix
    );
};

const renderUserDirectory = async (
    authorization: AuthorizationState,
    authorizationUserId: string,
    container: HTMLElement,
    allowRoleManagement: boolean
): Promise<void> => {
    const canManageStaff =
        allowRoleManagement &&
        hasPermission(
            authorization,
            "staff.manage"
        );

    const canManageOwner =
        hasPermission(
            authorization,
            "system.full_control"
        );

    const section =
        createElement(
            "section",
            "admin-user-directory"
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
        "User directory";

    const title =
        createElement(
            "h2"
        );

    title.textContent =
        "Platform users";

    const description =
        createElement(
            "p"
        );

    description.textContent =
        canManageStaff
            ? "Search accounts and manage their staff roles. Owner changes remain restricted to owner authority."
            : "Review platform accounts and their current role assignments.";

    heading.append(
        kicker,
        title,
        description
    );

    const form =
        createElement(
            "form",
            "admin-search-form"
        );

    const input =
        createElement(
            "input",
            "admin-search-input"
        );

    input.type =
        "search";

    input.name =
        "search";

    input.placeholder =
        "Search by email, display name, or user ID";

    input.autocomplete =
        "off";

    const submit =
        createElement(
            "button",
            "admin-button"
        );

    submit.type =
        "submit";

    submit.textContent =
        "Search";

    form.append(
        input,
        submit
    );

    const status =
        createElement(
            "p",
            "admin-status"
        );

    status.hidden =
        true;

    const results =
        createElement(
            "div",
            "admin-user-list"
        );

    section.append(
        heading,
        form,
        status,
        results
    );

    container.appendChild(
        section
    );

    const loadUsers = async (
        searchTerm: string
    ): Promise<void> => {
        results.replaceChildren();

        const loading =
            createElement(
                "p",
                "admin-loading"
            );

        loading.textContent =
            "Loading users…";

        results.appendChild(
            loading
        );

        const {
            data,
            error
        } =
            await supabaseClient
                .rpc(
                    "search_users",
                    {
                        search_term:
                            searchTerm,
                        result_limit:
                            50
                    }
                );

        if (error) {
            console.error(
                "User directory load error:",
                error
            );

            results.replaceChildren();

            const errorMessage =
                createElement(
                    "p",
                    "admin-error"
                );

            errorMessage.textContent =
                "Unable to load platform users.";

            results.appendChild(
                errorMessage
            );

            return;
        }

        const users =
            (data ||
                []) as DirectoryUser[];

        results.replaceChildren();

        if (!users.length) {
            const empty =
                createElement(
                    "p",
                    "admin-loading"
                );

            empty.textContent =
                "No matching users.";

            results.appendChild(
                empty
            );

            return;
        }

        users.forEach(
            (user) => {
                const card =
                    createElement(
                        "article",
                        "admin-user-card"
                    );

                const identity =
                    createElement(
                        "div",
                        "admin-user-identity"
                    );

                const name =
                    createElement(
                        "strong"
                    );

                name.textContent =
                    user.display_name ||
                    "Unnamed user";

                const email =
                    createElement(
                        "span",
                        "admin-user-email"
                    );

                email.textContent =
                    user.email ||
                    "No email available";

                const id =
                    createElement(
                        "span",
                        "admin-user-id"
                    );

                id.textContent =
                    user.user_id;

                identity.append(
                    name,
                    email,
                    id
                );

                const roleBlock =
                    createElement(
                        "div",
                        "admin-user-roles"
                    );

                const roleLabel =
                    createElement(
                        "span",
                        "admin-user-role-label"
                    );

                roleLabel.textContent =
                    "Current roles";

                const roleList =
                    createElement(
                        "div",
                        "admin-user-role-list"
                    );

                [...user.roles]
                    .sort()
                    .forEach(
                        (role) => {
                            const chip =
                                createElement(
                                    "span",
                                    "admin-role-tag"
                                );

                            chip.textContent =
                                formatRole(
                                    role
                                );

                            roleList.appendChild(
                                chip
                            );
                        }
                    );

                roleBlock.append(
                    roleLabel,
                    roleList
                );

                card.append(
                    identity,
                    roleBlock
                );

                if (
                    canManageStaff &&
                    user.user_id !==
                        authorizationUserId
                ) {
                    const control =
                        createElement(
                            "div",
                            "admin-role-controls"
                        );

                    const select =
                        createElement(
                            "select",
                            "admin-role-select"
                        );

                    select.setAttribute(
                        "aria-label",
                        `Role action for ${
                            user.display_name ||
                            user.email ||
                            "user"
                        }`
                    );

                    const roleOptions:
                        AppRole[] = [
                            "administrator",
                            "moderator",
                            "editor",
                            "support_human",
                            "support_ai"
                        ];

                    if (
                        canManageOwner
                    ) {
                        roleOptions.unshift(
                            "owner"
                        );
                    }

                    roleOptions.forEach(
                        (role) => {
                            const option =
                                createElement(
                                    "option"
                                );

                            option.value =
                                role;

                            option.textContent =
                                formatRole(
                                    role
                                );

                            select.appendChild(
                                option
                            );
                        }
                    );

                    const grantButton =
                        createElement(
                            "button",
                            "admin-button"
                        );

                    grantButton.type =
                        "button";

                    grantButton.textContent =
                        "Grant";

                    const revokeButton =
                        createElement(
                            "button",
                            "admin-button-secondary"
                        );

                    revokeButton.type =
                        "button";

                    revokeButton.textContent =
                        "Revoke";

                    const runRoleAction =
                        async (
                            enabled: boolean
                        ): Promise<void> => {
                            const selectedRole =
                                select.value as AppRole;

                            if (
                                selectedRole ===
                                    "owner" &&
                                !canManageOwner
                            ) {
                                setText(
                                    status,
                                    "Only owners can manage the owner role."
                                );

                                status.hidden =
                                    false;

                                return;
                            }

                            const actionLabel =
                                enabled
                                    ? "grant"
                                    : "revoke";

                            const confirmation =
                                window.confirm(
                                    `${
                                        actionLabel
                                            .charAt(
                                                0
                                            )
                                            .toUpperCase() +
                                        actionLabel.slice(
                                            1
                                        )
                                    } ${formatRole(
                                        selectedRole
                                    )} ${
                                        enabled
                                            ? "to"
                                            : "from"
                                    } ${
                                        user.display_name ||
                                        user.email ||
                                        "this user"
                                    }?`
                                );

                            if (
                                !confirmation
                            ) {
                                return;
                            }

                            grantButton.disabled =
                                true;

                            revokeButton.disabled =
                                true;

                            setText(
                                status,
                                "Applying role change…"
                            );

                            status.hidden =
                                false;

                            const {
                                data: changed,
                                error
                            } =
                                await supabaseClient
                                    .rpc(
                                        "set_user_role",
                                        {
                                            target_user_id:
                                                user.user_id,
                                            target_role:
                                                selectedRole,
                                            enabled
                                        }
                                    );

                            grantButton.disabled =
                                false;

                            revokeButton.disabled =
                                false;

                            if (error) {
                                console.error(
                                    "Role change error:",
                                    error
                                );

                                setText(
                                    status,
                                    error.message ||
                                        "Unable to change the role."
                                );

                                return;
                            }

                            setText(
                                status,
                                changed
                                    ? `Role ${
                                          enabled
                                              ? "granted"
                                              : "revoked"
                                      } successfully.`
                                    : "No role change was needed."
                            );

                            await loadUsers(
                                input.value.trim()
                            );
                        };

                    grantButton.addEventListener(
                        "click",
                        () => {
                            void runRoleAction(
                                true
                            );
                        }
                    );

                    revokeButton.addEventListener(
                        "click",
                        () => {
                            void runRoleAction(
                                false
                            );
                        }
                    );

                    control.append(
                        select,
                        grantButton,
                        revokeButton
                    );

                    card.appendChild(
                        control
                    );
                }

                results.appendChild(
                    card
                );
            }
        );
    };

    form.addEventListener(
        "submit",
        (event) => {
            event.preventDefault();

            void loadUsers(
                input.value.trim()
            );
        }
    );

    await loadUsers("");
};

const renderStaffRoles = async (
    authorization: AuthorizationState,
    authorizationUserId: string
): Promise<void> => {
    if (!panelView) {
        return;
    }

    panelView.hidden =
        false;

    panelView.replaceChildren();

    const wrapper =
        createElement(
            "div",
            "admin-staff-panel"
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
        "Staff & Roles";

    const title =
        createElement(
            "h2"
        );

    title.textContent =
        "Staff management";

    const description =
        createElement(
            "p"
        );

    description.textContent =
        "Assign and revoke staff roles through the protected authorization layer.";

    heading.append(
        kicker,
        title,
        description
    );

    wrapper.appendChild(
        heading
    );

    await renderUserDirectory(
        authorization,
        authorizationUserId,
        wrapper,
        true
    );

    const matrixSection =
        createElement(
            "section",
            "admin-role-section"
        );

    const matrixHeading =
        createElement(
            "div",
            "admin-panel-view-heading"
        );

    const matrixKicker =
        createElement(
            "span",
            "panel-kicker"
        );

    matrixKicker.textContent =
        "Authorization model";

    const matrixTitle =
        createElement(
            "h2"
        );

    matrixTitle.textContent =
        "Role permission matrix";

    const matrixDescription =
        createElement(
            "p"
        );

    matrixDescription.textContent =
        "These mappings determine which platform capabilities each role receives.";

    matrixHeading.append(
        matrixKicker,
        matrixTitle,
        matrixDescription
    );

    matrixSection.appendChild(
        matrixHeading
    );

    await renderRoleMatrix(
        matrixSection
    );

    wrapper.appendChild(
        matrixSection
    );

    panelView.appendChild(
        wrapper
    );
};

const renderUsers = async (
    authorization: AuthorizationState,
    authorizationUserId: string
): Promise<void> => {
    if (!panelView) {
        return;
    }

    panelView.hidden =
        false;

    panelView.replaceChildren();

    await renderUserDirectory(
        authorization,
        authorizationUserId,
        panelView,
        hasPermission(
            authorization,
            "staff.manage"
        )
    );
};

const showPanelMessage = (
    panel: AdminPanelDefinition
): void => {
    if (!panelView) {
        return;
    }

    panelView.hidden =
        false;

    panelView.replaceChildren();

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
        "Authorized control";

    const title =
        createElement(
            "h2"
        );

    title.textContent =
        panel.label;

    const description =
        createElement(
            "p"
        );

    description.textContent =
        panel.description;

    heading.append(
        kicker,
        title,
        description
    );

    const state =
        createElement(
            "div",
            "admin-panel-placeholder"
        );

    const stateTitle =
        createElement(
            "strong"
        );

    stateTitle.textContent =
        "Management surface not implemented yet.";

    const stateText =
        createElement(
            "span"
        );

    stateText.textContent =
        "Authorization is active for this control area. The underlying management interface will be added without changing the permission model.";

    state.append(
        stateTitle,
        stateText
    );

    panelView.append(
        heading,
        state
    );
};

const renderPanels = (
    authorization: AuthorizationState,
    authorizationUserId: string
): void => {
    if (!panelList) {
        return;
    }

    const availablePanels =
        panelDefinitions.filter(
            (panel) =>
                !panel.permission ||
                hasPermission(
                    authorization,
                    panel.permission
                )
        );

    setText(
        panelCount,
        `${availablePanels.length} available`
    );

    panelList.replaceChildren();

    availablePanels.forEach(
        (panel) => {
            const button =
                createElement(
                    "button",
                    "admin-panel-card"
                );

            button.type =
                "button";

            button.dataset.panel =
                panel.id;

            const heading =
                createElement(
                    "span",
                    "admin-panel-card-heading"
                );

            heading.textContent =
                panel.label;

            const description =
                createElement(
                    "span",
                    "admin-panel-card-description"
                );

            description.textContent =
                panel.description;

            const permission =
                createElement(
                    "span",
                    "admin-panel-card-permission"
                );

            permission.textContent =
                panel.permission ||
                "Base administration access";

            button.append(
                heading,
                description,
                permission
            );

            button.addEventListener(
                "click",
                () => {
                    window.location.hash =
                        panel.id;

                    if (
                        panel.id ===
                        "roles"
                    ) {
                        void renderStaffRoles(
                            authorization,
                            authorizationUserId
                        );

                        return;
                    }

                    if (
                        panel.id ===
                        "users"
                    ) {
                        void renderUsers(
                            authorization,
                            authorizationUserId
                        );

                        return;
                    }

                    showPanelMessage(
                        panel
                    );
                }
            );

            panelList.appendChild(
                button
            );
        }
    );
};

const renderAuthorization =
    (
        authorization: AuthorizationState
    ): void => {
        setText(
            roleValue,
            authorization.roles
                .map(
                    formatRole
                )
                .join(", ") ||
                "User"
        );

        setText(
            permissionCount,
            String(
                authorization
                    .permissions
                    .size
            )
        );

        setText(
            accessMode,
            authorization.permissions.has(
                "system.full_control"
            )
                ? "Full system control"
                : "Scoped permissions"
        );

        setText(
            accessState,
            "Access granted"
        );

        accessState?.setAttribute(
            "data-state",
            "granted"
        );
    };

const handleInitialPanel =
    async (
        authorization: AuthorizationState,
        authorizationUserId: string
    ): Promise<void> => {
        const panel =
            window.location.hash
                .replace(
                    "#",
                    ""
                );

        if (
            !panel ||
            !panelView
        ) {
            return;
        }

        const definition =
            panelDefinitions.find(
                (item) =>
                    item.id ===
                    panel
            );

        if (!definition) {
            return;
        }

        if (
            definition.permission &&
            !hasPermission(
                authorization,
                definition.permission
            )
        ) {
            panelView.hidden =
                true;

            return;
        }

        if (
            panel === "roles"
        ) {
            await renderStaffRoles(
                authorization,
                authorizationUserId
            );

            return;
        }

        if (
            panel === "users"
        ) {
            await renderUsers(
                authorization,
                authorizationUserId
            );

            return;
        }

        showPanelMessage(
            definition
        );
    };

const loadAdmin =
    async (): Promise<void> => {
        let user;

        try {
            user =
                await getCurrentUser();
        } catch (error) {
            console.error(
                "Authentication check failed:",
                error
            );

            redirectToLogin();

            return;
        }

        if (!user) {
            redirectToLogin();

            return;
        }

        let authorization:
            | AuthorizationState;

        try {
            authorization =
                await loadAuthorization(
                    user.id
                );
        } catch (error) {
            console.error(
                "Authorization lookup failed:",
                error
            );

            setText(
                accessState,
                "Unable to verify access"
            );

            return;
        }

        if (
            authorization.permissions
                .size === 0
        ) {
            window.location.href =
                "workspace.html";

            return;
        }

        renderAuthorization(
            authorization
        );

        renderPanels(
            authorization,
            user.id
        );

        await handleInitialPanel(
            authorization,
            user.id
        );

        window.addEventListener(
            "hashchange",
            () => {
                void handleInitialPanel(
                    authorization,
                    user.id
                );
            }
        );
    };

void loadAdmin();