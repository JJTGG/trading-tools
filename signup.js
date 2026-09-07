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

    const { error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        console.error(error);
        message.textContent = error.message;
        return;
    }

    message.textContent = "Account created. Check your email to confirm your account.";
});