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
        "#settings-form"
    );

const message =
    document.querySelector<HTMLElement>(
        "#settings-message"
    );

const submitButton =
    document.querySelector<HTMLButtonElement>(
        "#settings-submit"
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
            : "Save changes";
};

const loadSettings =
    async (): Promise<void> => {
        const context =
            await requireAccountProfile();

        if (!context) {
            return;
        }

        const {
            user,
            profile
        } = context;

        const displayName =
            document.querySelector<HTMLInputElement>(
                "#display-name"
            );

        const currency =
            document.querySelector<HTMLSelectElement>(
                "#preferred-currency"
            );

        const experience =
            document.querySelector<HTMLSelectElement>(
                "#experience-level"
            );

        const accountEmail =
            document.querySelector<HTMLElement>(
                "#account-email"
            );

        if (displayName) {
            displayName.value =
                profile.display_name ||
                "";
        }

        if (currency) {
            currency.value =
                profile.preferred_currency ||
                "USD";
        }

        if (experience) {
            experience.value =
                profile.experience_level ||
                "beginner";
        }

        if (accountEmail) {
            accountEmail.textContent =
                user.email ||
                "Unknown";
        }

        const markets =
            new Set(
                profile.markets_traded ||
                []
            );

        document
            .querySelectorAll<HTMLInputElement>(
                'input[name="markets-traded"]'
            )
            .forEach(
                (input) => {
                    input.checked =
                        markets.has(
                            input.value
                        );
                }
            );
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

        const displayName =
            document.querySelector<HTMLInputElement>(
                "#display-name"
            )?.value
                .trim() || "";

        const preferredCurrency =
            document.querySelector<HTMLSelectElement>(
                "#preferred-currency"
            )?.value || "";

        const experienceLevel =
            document.querySelector<HTMLSelectElement>(
                "#experience-level"
            )?.value || "";

        const marketsTraded =
            Array.from(
                document.querySelectorAll<HTMLInputElement>(
                    'input[name="markets-traded"]:checked'
                )
            ).map(
                (input) =>
                    input.value
            );

        if (!displayName) {
            setMessage(
                "Enter a display name.",
                "error"
            );

            return;
        }

        if (!preferredCurrency) {
            setMessage(
                "Select a preferred currency.",
                "error"
            );

            return;
        }

        if (!experienceLevel) {
            setMessage(
                "Select your experience level.",
                "error"
            );

            return;
        }

        if (!marketsTraded.length) {
            setMessage(
                "Select at least one market.",
                "error"
            );

            return;
        }

        setSubmitting(true);

        setMessage(
            "Saving changes...",
            "neutral"
        );

        try {
            await updateUserProfile(
                context.user.id,
                {
                    display_name:
                        displayName,
                    preferred_currency:
                        preferredCurrency,
                    markets_traded:
                        marketsTraded,
                    experience_level:
                        experienceLevel
                }
            );

            setMessage(
                "Changes saved.",
                "success"
            );
        } catch (error) {
            console.error(
                "Settings update error:",
                error
            );

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save your changes.",
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

void loadSettings();