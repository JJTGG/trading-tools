import "../styles/tokens.css";
import "../styles/base.css";
import "./auth.css";

import {
    getClient,
    requireOnboarding
} from "../auth/runtime";

const form =
    document.querySelector<HTMLFormElement>(
        "#onboarding-form"
    );

const message =
    document.querySelector<HTMLElement>(
        "#onboarding-message"
    );

const submitButton =
    document.querySelector<HTMLButtonElement>(
        "#onboarding-submit"
    );

let authenticatedUserId:
    string | null = null;

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
    submitting: boolean
): void => {
    if (!submitButton) {
        return;
    }

    submitButton.disabled =
        submitting;

    submitButton.textContent =
        submitting
            ? "Saving workspace..."
            : "Enter Workspace";
};

const initialize =
    async (): Promise<void> => {
        const context =
            await requireOnboarding();

        if (!context) {
            return;
        }

        authenticatedUserId =
            context.user.id;

        if (context.profile) {
            document.querySelector<HTMLInputElement>(
                "#display-name"
            )!.value =
                context.profile.display_name ||
                "";

            document.querySelector<HTMLSelectElement>(
                "#preferred-currency"
            )!.value =
                context.profile.preferred_currency ||
                "";

            document.querySelector<HTMLSelectElement>(
                "#experience-level"
            )!.value =
                context.profile.experience_level ||
                "";
        }
    };

form?.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        if (!authenticatedUserId) {
            setMessage(
                "Your session is unavailable. Please sign in again.",
                "error"
            );

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

        if (!marketsTraded.length) {
            setMessage(
                "Select at least one market.",
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

        setSubmitting(true);

        setMessage(
            "Saving workspace...",
            "neutral"
        );

        try {
            const {
                data,
                error
            } =
                await getClient()
                    .from("profiles")
                    .update({
                        display_name:
                            displayName,
                        preferred_currency:
                            preferredCurrency,
                        markets_traded:
                            marketsTraded,
                        experience_level:
                            experienceLevel,
                        onboarding_completed:
                            true
                    })
                    .eq(
                        "id",
                        authenticatedUserId
                    )
                    .select("id")
                    .maybeSingle();

            if (error) {
                console.error(
                    "Onboarding update error:",
                    error
                );

                setMessage(
                    error.message ||
                        "Unable to save your workspace.",
                    "error"
                );

                return;
            }

            if (!data) {
                setMessage(
                    "Your profile could not be updated. Please sign in again.",
                    "error"
                );

                return;
            }

            setMessage(
                "Workspace ready.",
                "success"
            );

            window.location.href =
                "workspace.html";
        } catch (error) {
            console.error(
                "Onboarding request failed:",
                error
            );

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save your workspace.",
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    }
);

void initialize();