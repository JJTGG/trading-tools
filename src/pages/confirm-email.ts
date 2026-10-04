import "../styles/tokens.css";
import "../styles/base.css";
import "./auth.css";

import { supabaseClient } from "../data/supabase";
import { redirectAfterAuthentication } from "../auth/runtime";

const title =
    document.querySelector<HTMLElement>(
        "#confirm-email-title"
    );

const copy =
    document.querySelector<HTMLElement>(
        "#confirm-email-copy"
    );

const message =
    document.querySelector<HTMLElement>(
        "#confirm-email-message"
    );

const action =
    document.querySelector<HTMLAnchorElement>(
        "#confirm-email-action"
    );

const setState = (
    heading: string,
    description: string,
    messageText: string,
    state: "error" | "success" | "neutral"
): void => {
    if (title) {
        title.textContent =
            heading;
    }

    if (copy) {
        copy.textContent =
            description;
    }

    if (message) {
        message.textContent =
            messageText;

        if (state === "neutral") {
            delete message.dataset.state;
        } else {
            message.dataset.state =
                state;
        }
    }
};

const initialize =
    async (): Promise<void> => {
        const params =
            new URLSearchParams(
                window.location.hash.replace(
                    /^#/,
                    ""
                )
            );

        const authError =
            params.get(
                "error_description"
            ) ||
            params.get("error");

        if (authError) {
            setState(
                "Email confirmation failed",
                "The confirmation link could not be completed.",
                authError,
                "error"
            );

            if (action) {
                action.hidden = false;
            }

            return;
        }

        try {
            const {
                data,
                error
            } =
                await supabaseClient
                    .auth
                    .getSession();

            if (error) {
                throw error;
            }

            if (!data.session) {
                setState(
                    "Email confirmation incomplete",
                    "The confirmation link may have expired or already been used.",
                    "Please request a new confirmation email or sign in after confirming your address.",
                    "error"
                );

                if (action) {
                    action.hidden = false;
                }

                return;
            }

            setState(
                "Email confirmed",
                "Your account is verified. Opening workspace setup...",
                "Verification complete.",
                "success"
            );

            await redirectAfterAuthentication();
        } catch (error) {
            console.error(
                "Email confirmation failed:",
                error
            );

            setState(
                "Email confirmation failed",
                "We could not finish verifying your account.",
                error instanceof Error
                    ? error.message
                    : "Please try the confirmation link again.",
                "error"
            );

            if (action) {
                action.hidden = false;
            }
        }
    };

void initialize();