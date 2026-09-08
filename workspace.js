const userName = document.getElementById("workspace-name");
const userEmail = document.getElementById("workspace-user");
const logoutButton = document.getElementById("logout-button");
const savedCalculations = document.getElementById("saved-calculations");

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

    await loadSavedCalculations(user.id);
}

async function loadSavedCalculations(userId) {
    const { data, error } = await supabaseClient
        .from("saved_calculations")
        .select("id, tool, inputs, result, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error("Saved calculations error:", error);
        savedCalculations.innerHTML =
            '<p class="empty-state">Unable to load saved calculations.</p>';
        return;
    }

    if (!data.length) {
        savedCalculations.innerHTML =
            '<p class="empty-state">No saved calculations yet.</p>';
        return;
    }

    savedCalculations.innerHTML = data.map((calculation) => `
        <div class="saved-calculation">
            <div>
                <strong>${formatToolName(calculation.tool)}</strong>
                <span>${formatCalculationResult(calculation.result)}</span>
            </div>
            <button
                type="button"
                class="delete-calculation"
                data-id="${calculation.id}"
            >
                Delete
            </button>
        </div>
    `).join("");

    savedCalculations.querySelectorAll(".delete-calculation").forEach((button) => {
        button.addEventListener("click", () => {
            deleteCalculation(button.dataset.id);
        });
    });
}

async function deleteCalculation(id) {
    const button = savedCalculations.querySelector(
        `.delete-calculation[data-id="${id}"]`
    );

    if (!button) {
        return;
    }

    button.disabled = true;
    button.textContent = "Deleting...";

    const { error } = await supabaseClient
        .from("saved_calculations")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Delete calculation error:", error);
        button.disabled = false;
        button.textContent = "Delete";
        return;
    }

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (user) {
        await loadSavedCalculations(user.id);
    }
}

function formatToolName(tool) {
    return tool
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCalculationResult(result) {
    if (!result || typeof result !== "object") {
        return "Saved calculation";
    }

    const entries = Object.entries(result);

    if (!entries.length) {
        return "Saved calculation";
    }

    return entries
        .slice(0, 2)
        .map(([key, value]) => `${formatToolName(key)}: ${value}`)
        .join(" · ");
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