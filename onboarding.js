const form = document.getElementById("onboarding-form");
const message = document.getElementById("onboarding-message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        message.textContent = "Your session has expired. Please sign in again.";
        return;
    }

    const displayName = document.getElementById("display-name").value.trim();
    const preferredCurrency = document.getElementById("preferred-currency").value;
    const experienceLevel = document.getElementById("experience-level").value;

    const marketsTraded = [
        ...document.querySelectorAll('input[name="markets-traded"]:checked')
    ].map((input) => input.value);

    if (!marketsTraded.length) {
        message.textContent = "Select at least one market.";
        return;
    }

    message.textContent = "Saving your workspace...";

    const { error } = await supabaseClient
        .from("profiles")
        .update({
            display_name: displayName,
            preferred_currency: preferredCurrency,
            markets_traded: marketsTraded,
            experience_level: experienceLevel,
            onboarding_completed: true
        })
        .eq("id", user.id);

    if (error) {
        console.error("Onboarding error:", error);
        message.textContent = error.message;
        return;
    }

    message.textContent = "Workspace setup complete.";
});