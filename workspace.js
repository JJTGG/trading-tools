const userName = document.getElementById("workspace-name");
const userEmail = document.getElementById("workspace-user");
const logoutButton = document.getElementById("logout-button");
const savedCalculations = document.getElementById("saved-calculations");
const watchlist = document.getElementById("watchlist");

const watchlistForm = document.getElementById("watchlist-form");
const watchlistMessage = document.getElementById("watchlist-message");

let currentUser = null;

async function loadWorkspace() {
    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;
    userEmail.textContent = user.email;

    const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select(
            "display_name, onboarding_completed, workspace_preferences"
        )
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

    applyWorkspacePreferences(
        profile.workspace_preferences || {}
    );

    await loadSavedCalculations(user.id);
    await loadWatchlist(user.id);
}

function applyWorkspacePreferences(preferences) {
    const density = preferences.density || "comfortable";

    document.body.dataset.workspaceDensity = density;
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

    savedCalculations
        .querySelectorAll(".delete-calculation")
        .forEach((button) => {
            button.addEventListener("click", () => {
                deleteCalculation(button.dataset.id);
            });
        });
}

async function loadWatchlist(userId) {
    const { data, error } = await supabaseClient
        .from("watchlist_items")
        .select("id, symbol, asset_type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Watchlist error:", error);

        watchlist.innerHTML =
            '<p class="empty-state">Unable to load watchlist.</p>';

        return;
    }

    if (!data.length) {
        watchlist.innerHTML =
            '<p class="empty-state">Your watchlist is empty.</p>';

        return;
    }

    watchlist.innerHTML = data.map((item) => `
        <div class="watchlist-item">
            <div>
                <strong>${item.symbol}</strong>
                <span>${formatToolName(item.asset_type)}</span>
            </div>

            <button
                type="button"
                class="delete-watchlist"
                data-id="${item.id}"
            >
                Remove
            </button>
        </div>
    `).join("");

    watchlist
        .querySelectorAll(".delete-watchlist")
        .forEach((button) => {
            button.addEventListener("click", () => {
                removeWatchlistItem(button.dataset.id);
            });
        });
}

async function addWatchlistItem(event) {
    event.preventDefault();

    if (!currentUser) {
        return;
    }

    const symbolInput =
        document.getElementById("watchlist-symbol");

    const typeInput =
        document.getElementById("watchlist-type");

    const symbol =
        symbolInput.value.trim().toUpperCase();

    const assetType = typeInput.value;

    if (!symbol) {
        return;
    }

    watchlistMessage.textContent = "Adding...";

    const { error } = await supabaseClient
        .from("watchlist_items")
        .insert({
            user_id: currentUser.id,
            symbol,
            asset_type: assetType
        });

    if (error) {
        console.error("Add watchlist error:", error);

        if (error.code === "23505") {
            watchlistMessage.textContent =
                "That symbol is already on your watchlist.";
        } else {
            watchlistMessage.textContent =
                "Unable to add that symbol.";
        }

        return;
    }

    symbolInput.value = "";
    watchlistMessage.textContent =
        "Added to your watchlist.";

    await loadWatchlist(currentUser.id);
}

async function removeWatchlistItem(id) {
    const { error } = await supabaseClient
        .from("watchlist_items")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Remove watchlist error:", error);
        return;
    }

    await loadWatchlist(currentUser.id);
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

    await loadSavedCalculations(currentUser.id);
}

function formatToolName(value) {
    return value
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
        .map(
            ([key, value]) =>
                `${formatToolName(key)}: ${value}`
        )
        .join(" · ");
}

watchlistForm.addEventListener(
    "submit",
    addWatchlistItem
);

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "Signing out...";

    const { error } =
        await supabaseClient.auth.signOut({
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