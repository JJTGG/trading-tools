const userName = document.getElementById("workspace-name");
const userEmail = document.getElementById("workspace-user");
const logoutButton = document.getElementById("logout-button");

async function loadWorkspace() {
    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "login.html";
        return;
    }

    userEmail.textContent = user.email;

    const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("display_name, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Profile lookup error:", profileError);
        return;
    }

    if (!profile || !profile.onboarding_completed) {
        window.location.href = "onboarding.html";
        return;
    }

    userName.textContent = profile.display_name || "Trader";
}

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

loadWorkspace();