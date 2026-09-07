const form = document.getElementById("signup-form");
const message = document.getElementById("signup-message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;

    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        return;
    }

    message.textContent = "Creating your account...";

    try {
        const { error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            console.error("Signup error:", error);

            const details = [
                error.message,
                error.code ? `Code: ${error.code}` : "",
                error.status ? `Status: ${error.status}` : ""
            ].filter(Boolean).join(" — ");

            message.textContent = details;
            return;
        }

        message.textContent =
            "Account created. Check your email to confirm your account.";
    } catch (error) {
        console.error("Signup request failed:", error);

        message.textContent =
            `Signup request failed: ${error.message || "Unknown error"}`;
    }
});w