const form = document.getElementById("settings-form");
const message = document.getElementById("settings-message");
const logoutButton = document.getElementById("logout-button");

async function loadSettings() {
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
        .select(
            "display_name, preferred_currency, markets_traded, experience_level, onboarding_completed"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Settings profile error:", error);
        message.textContent = "Unable to load your profile.";
        return;
    }

    if (!profile || !profile.onboarding_completed) {
        window.location.href = "onboarding.html";
        return;
    }

    document.getElementById("display-name").value =
        profile.display_name || "";

    document.getElementById("preferred-currency").value =
        profile.preferred_currency || "USD";

    document.getElementById("experience-level").value =
        profile.experience_level || "beginner";

    const markets = profile.markets_traded || [];

    document
        .querySelectorAll('input[name="markets-traded"]')
        .forEach((input) => {
            input.checked = markets.includes(input.value);
        });
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

    const displayName = document
        .getElementById("display-name")
        .value
        .trim();

    const preferredCurrency =
        document.getElementById("preferred-currency").value;

    const experienceLevel =
        document.getElementById("experience-level").value;

    const marketsTraded = [
        ...document.querySelectorAll(
            'input[name="markets-traded"]:checked'
        )
    ].map((input) => input.value);

    if (!marketsTraded.length) {
        message.textContent = "Select at least one market.";
        return;
    }

    message.textContent = "Saving changes...";

    const { error } = await supabaseClient
        .from("profiles")
        .update({
            display_name: displayName,
            preferred_currency: preferredCurrency,
            markets_traded: marketsTraded,
            experience_level: experienceLevel
        })
        .eq("id", user.id);

    if (error) {
        console.error("Settings update error:", error);
        message.textContent = "Unable to save your changes.";
        return;
    }

    message.textContent = "Changes saved.";
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

loadSettings();