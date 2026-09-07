const form = document.getElementById("signup-form");
const message = document.getElementById("signup-message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    message.textContent = "Creating your account...";

    const { error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        message.textContent = error.message;
        return;
    }

    message.textContent = "Account created. Check your email to confirm your account.";
});