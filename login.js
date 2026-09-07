const form = document.getElementById("login-form");
const message = document.getElementById("login-message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    message.textContent = "Signing you in...";

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error("Login error:", error);
            message.textContent = error.message;
            return;
        }

        message.textContent = "Signed in successfully.";
    } catch (error) {
        console.error("Login request failed:", error);
        message.textContent =
            `Login request failed: ${error.message || "Unknown error"}`;
    }
});