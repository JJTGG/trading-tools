import "../styles/tokens.css";
import "../styles/base.css";
import "./auth.css";

import {
    getClient,
    redirectAfterAuthentication
} from "../auth/runtime";

const form =
    document.querySelector<HTMLFormElement>(
        "#signup-form"
    );

const message =
    document.querySelector<HTMLElement>(
        "#signup-message"
    );

const submitButton =
    document.querySelector<HTMLButtonElement>(
        "#signup-submit"
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
    submitting: boolean
): void => {
    if (!submitButton) {
        return;
    }

    submitButton.disabled =
        submitting;

    submitButton.textContent =
        submitting
            ? "Creating account..."
            : "Create account";
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
                    "#signup-email"
                )
                ?.value
                .trim() || "";

        const password =
            document
                .querySelector<HTMLInputElement>(
                    "#signup-password"
                )
                ?.value || "";

        const confirmPassword =
            document
                .querySelector<HTMLInputElement>(
                    "#signup-confirm-password"
                )
                ?.value || "";

        if (
            password !==
            confirmPassword
        ) {
            setMessage(
                "Passwords do not match.",
                "error"
            );

            return;
        }

        if (password.length < 6) {
            setMessage(
                "Password must be at least 6 characters.",
                "error"
            );

            return;
        }

        setSubmitting(true);

        setMessage(
            "Creating your account...",
            "neutral"
        );

        try {
            const {
                data,
                error
            } =
                await getClient()
                    .auth
                    .signUp({
                        email,
                        password
                    });

            if (error) {
                console.error(
                    "Signup error:",
                    error
                );

                setMessage(
                    error.message ||
                        "Unable to create your account.",
                    "error"
                );

                return;
            }

            if (data.session) {
                setMessage(
                    "Account created. Opening setup...",
                    "success"
                );

                await redirectAfterAuthentication();

                return;
            }

            setMessage(
                "Account created. Check your email to confirm your account, then sign in.",
                "success"
            );
        } catch (error) {
            console.error(
                "Signup request failed:",
                error
            );

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to create your account.",
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    }
);

void redirectIfAlreadyAuthenticated();