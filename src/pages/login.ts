import "../styles/tokens.css";
import "../styles/base.css";
import "./auth.css";

import {
    getClient,
    redirectAfterAuthentication
} from "../auth/runtime";

const form =
    document.querySelector<HTMLFormElement>(
        "#login-form"
    );

const message =
    document.querySelector<HTMLElement>(
        "#login-message"
    );

const submitButton =
    document.querySelector<HTMLButtonElement>(
        "#login-submit"
    );

const setMessage = (
    text: string,
    state: "error" | "success" | "neutral"
): void => {
    if (!message) {
        return;
    }

    message.textContent = text;

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
            ? "Signing in..."
            : "Sign in";
};

const redirectIfAlreadyAuthenticated =
    async (): Promise<void> => {
        try {
            const {
                data
            } =
                await getClient()
                    .auth
                    .getUser();

            if (!data.user) {
                return;
            }

            await redirectAfterAuthentication();
        } catch (error) {
            console.error(
                "Existing session check failed:",
                error
            );
        }
    };

form?.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        const email =
            document
                .querySelector<HTMLInputElement>(
                    "#login-email"
                )
                ?.value
                .trim() || "";

        const password =
            document
                .querySelector<HTMLInputElement>(
                    "#login-password"
                )
                ?.value || "";

        if (!email || !password) {
            setMessage(
                "Enter your email and password.",
                "error"
            );

            return;
        }

        setSubmitting(true);
        setMessage(
            "Signing you in...",
            "neutral"
        );

        try {
            const {
                error
            } =
                await getClient()
                    .auth
                    .signInWithPassword({
                        email,
                        password
                    });

            if (error) {
                console.error(
                    "Login error:",
                    error
                );

                setMessage(
                    error.message ||
                        "Unable to sign in.",
                    "error"
                );

                return;
            }

            setMessage(
                "Signed in. Opening workspace...",
                "success"
            );

            await redirectAfterAuthentication();
        } catch (error) {
            console.error(
                "Login request failed:",
                error
            );

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to sign in.",
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    }
);

void redirectIfAlreadyAuthenticated();