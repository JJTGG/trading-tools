import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/app-shell.css";
import "./account.css";

import {
    getClient,
    requireAccountProfile,
    updateUserProfile
} from "../auth/runtime";

const form =
    document.querySelector<HTMLFormElement>(
        "#preferences-form"
    );

const message =
    document.querySelector<HTMLElement>(
        "#preferences-message"
    );

const submitButton =
    document.querySelector<HTMLButtonElement>(
        "#preferences-submit"
    );

const logoutButton =
    document.querySelector<HTMLButtonElement>(
        "#logout-button"
    );

const setMessage = (
    text: string,
    state: "error" | "success" | "neutral"
): void => {
    if (!message) {
        return;
    }

    message.textContent =
        text;

    if (state === "neutral") {
        delete message.dataset.state;
    } else {
        message.dataset.state =
            state;
    }
};

const setSubmitting = (
    value: boolean
): void => {
    if (!submitButton) {
        return;
    }

    submitButton.disabled =
        value;

    submitButton.textContent =
        value
            ? "Saving..."
            : "Save preferences";
};

const loadPreferences =
    async (): Promise<void> => {
        const context =
            await requireAccountProfile();

        if (!context) {
            return;
        }

        const preferences =
            context.profile
                .workspace_preferences ||
            {};

        const density =
            document.querySelector<HTMLSelectElement>(
                "#workspace-density"
            );

        const defaultPage =
            document.querySelector<HTMLSelectElement>(
                "#default-page"
            );

        if (density) {
            density.value =
                typeof preferences.density ===
                    "string"
                    ? preferences.density
                    : "comfortable";
        }

        if (defaultPage) {
            defaultPage.value =
                typeof preferences.default_page ===
                    "string"
                    ? preferences.default_page
                    : "workspace";
        }
    };

form?.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        const context =
            await requireAccountProfile();

        if (!context) {
            return;
        }

        const density =
            document.querySelector<HTMLSelectElement>(
                "#workspace-density"
            )?.value ||
            "comfortable";

        const defaultPage =
            document.querySelector<HTMLSelectElement>(
                "#default-page"
            )?.value ||
            "workspace";

        setSubmitting(true);

        setMessage(
            "Saving preferences...",
            "neutral"
        );

        try {
            await updateUserProfile(
                context.user.id,
                {
                    workspace_preferences: {
                        density,
                        default_page:
                            defaultPage
                    }
                }
            );

            setMessage(
                "Preferences saved.",
                "success"
            );
        } catch (error) {
            console.error(
                "Preferences update error:",
                error
            );

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save your preferences.",
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    }
);

logoutButton?.addEventListener(
    "click",
    async () => {
        logoutButton.disabled =
            true;

        logoutButton.textContent =
            "Signing out...";

        const {
            error
        } =
            await getClient()
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
    }
);

void loadPreferences();