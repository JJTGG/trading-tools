const form = document.getElementById("preferences-form");
const message = document.getElementById("preferences-message");
const logoutButton = document.getElementById("logout-button");

async function loadPreferences() {
    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("workspace_preferences, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Preferences lookup error:", error);
        message.textContent = "Unable to load your preferences.";
        return;
    }

    if (!profile || !profile.onboarding_completed) {
        window.location.href = "onboarding.html";
        return;
    }

    const preferences = profile.workspace_preferences || {};

    document.getElementById("workspace-density").value =
        preferences.density || "comfortable";

    document.getElementById("default-page").value =
        preferences.default_page || "workspace";
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "login.html";
        return;
    }

    const preferences = {
        density: document.getElementById("workspace-density").value,
        default_page: document.getElementById("default-page").value
    };

    message.textContent = "Saving preferences...";

    const { error } = await supabaseClient
        .from("profiles")
        .update({
            workspace_preferences: preferences
        })
        .eq("id", user.id);

    if (error) {
        console.error("Preferences update error:", error);
        message.textContent = "Unable to save your preferences.";
        return;
    }

    message.textContent = "Preferences saved.";
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "Signing out...";

    const { error } = await supabaseClient.auth.signOut({
        scope: "local"
    });

    if (error) {
        console.error("Logout error:", error);
        logoutButton.disabled = false;
        logoutButton.textContent = "Sign out";
        return;
    }

    window.location.href = "login.html";
});

loadPreferences();