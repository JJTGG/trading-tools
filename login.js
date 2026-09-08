const form = document.getElementById("login-form");
const message = document.getElementById("login-message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    message.textContent = "Signing you in...";

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error("Login error:", error);
            message.textContent = error.message;
            return;
        }

        const user = data.user;

        const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("onboarding_completed, workspace_preferences")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Profile lookup error:", profileError);
            message.textContent = "Signed in, but we couldn't load your workspace.";
            return;
        }

        if (!profile || !profile.onboarding_completed) {
            window.location.href = "onboarding.html";
            return;
        }

        const preferences = profile.workspace_preferences || {};
        const defaultPage = preferences.default_page || "workspace";

        message.textContent = "Signed in successfully.";

        if (defaultPage === "tools") {
            window.location.href = "tools.html";
            return;
        }

        window.location.href = "workspace.html";
    } catch (error) {
        console.error("Login request failed:", error);
        message.textContent =
            `Login request failed: ${error.message || "Unknown error"}`;
    }
});