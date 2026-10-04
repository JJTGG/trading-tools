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

interface RoleRecord {
    role: string;
    name: string;
    description: string;
}

interface RolePermissionRecord {
    role: string;
    permission: string;
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
                "Inspect the platform role catalogue and its permission mapping.",
            permission:
                "staff.manage"
        },
        {
            id: "users",
            label: "Users",
            description:
                "Review and manage platform user accounts.",
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
        element.textContent = value;
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

const showPanelMessage = (
    panel: AdminPanelDefinition
): void => {
    if (!panelView) {
        return;
    }

    panelView.hidden = false;
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
        createElement("h2");

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
        createElement("strong");

    stateTitle.textContent =
        "Management surface not implemented yet.";

    const stateText =
        createElement("span");

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

const renderRoleMatrix =
    async (): Promise<void> => {
        if (!panelView) {
            return;
        }

        panelView.hidden = false;
        panelView.replaceChildren();

        const loading =
            createElement(
                "p",
                "admin-loading"
            );

        loading.textContent =
            "Loading role matrix…";

        panelView.appendChild(
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
                .from(
                    "role_permissions"
                )
                .select(
                    "role, permission"
                )
        ]);

        if (
            rolesResult.error ||
            permissionsResult.error
        ) {
            console.error(
                "Role matrix load error:",
                rolesResult.error ||
                    permissionsResult.error
            );

            panelView.replaceChildren();

            const error =
                createElement(
                    "p",
                    "admin-error"
                );

            error.textContent =
                "Unable to load the role matrix.";

            panelView.appendChild(
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

        const wrapper =
            createElement(
                "div",
                "admin-role-matrix"
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
            createElement("h2");

        title.textContent =
            "Role permission matrix";

        const description =
            createElement("p");

        description.textContent =
            "These mappings define the capabilities available to each application role.";

        heading.append(
            kicker,
            title,
            description
        );

        wrapper.appendChild(
            heading
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
                    createElement("strong");

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

                const roleDescription =
                    createElement("p");

                roleDescription.textContent =
                    role.description;

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

                const permissionList =
                    createElement(
                        "div",
                        "admin-permission-list"
                    );

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
                    roleDescription,
                    permissionList
                );

                wrapper.appendChild(
                    card
                );
            }
        );

        panelView.replaceChildren(
            wrapper
        );
    };

const renderPanels = (
    authorization: AuthorizationState
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

    panelCount &&
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
                        void renderRoleMatrix();
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
                .join(", ")
                .replace(
                    /_/g,
                    " "
                ) || "User"
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
    async (): Promise<void> => {
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
            panel === "roles"
        ) {
            await renderRoleMatrix();
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
            authorization
        );

        await handleInitialPanel();
    };

window.addEventListener(
    "hashchange",
    () => {
        void handleInitialPanel();
    }
);

void loadAdmin();