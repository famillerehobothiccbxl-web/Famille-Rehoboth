
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginMessage = document.getElementById("loginMessage");

function showMessage(message, success = false) {
  loginMessage.textContent = message;
  loginMessage.style.color = success ? "#16803c" : "#b42318";
}

function switchTab(tab) {
  const isLogin = tab === "login";

  loginForm.classList.toggle("hidden", !isLogin);
  signupForm.classList.toggle("hidden", isLogin);

  loginTab.classList.toggle("active", isLogin);
  signupTab.classList.toggle("active", !isLogin);

  showMessage("");
}

loginTab.addEventListener("click", () => switchTab("login"));
signupTab.addEventListener("click", () => switchTab("signup"));

// INSCRIPTION D'UN REFERENT
signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullname = document.getElementById("signupFullname").value.trim();
  const username = document.getElementById("signupUsername").value.trim().toLowerCase();
  const password = document.getElementById("signupPassword").value;
  const confirmation = document.getElementById("confirmPassword").value;
  const button = document.getElementById("signupButton");

  if (password.length < 8) {
    showMessage("Le mot de passe doit contenir au moins 8 caractères.");
    return;
  }

  if (password !== confirmation) {
    showMessage("Les deux mots de passe ne correspondent pas.");
    return;
  }

  button.disabled = true;
  button.textContent = "Envoi en cours...";
  showMessage("");

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "gestion-comptes",
      {
        body: {
          action: "signup",
          fullname,
          username,
          password
        }
      }
    );

    if (error) throw error;
    if (!data || !data.success) {
      throw new Error(data?.error || "Inscription impossible.");
    }

    signupForm.reset();
    switchTab("login");

    showMessage(
      "Votre demande a été envoyée. Vous pourrez vous connecter après validation par un administrateur.",
      true
    );

  } catch (error) {
    console.error("Erreur inscription :", error.message);
    showMessage(
      error.message || "Une erreur est survenue lors de l'inscription."
    );
  } finally {
    button.disabled = false;
    button.textContent = "Envoyer ma demande";
  }
});

// CONNEXION
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const button = document.getElementById("loginButton");

  button.disabled = true;
  button.textContent = "Connexion en cours...";
  showMessage("");

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "gestion-comptes",
      {
        body: {
          action: "login",
          username,
          password
        }
      }
    );

    if (error) {
      let message = "Connexion impossible.";
      try {
        const details = await error.context.json();
        message = details.error || message;
      } catch (_) {}
      throw new Error(message);
    }

    if (!data || !data.session || !data.profile) {
      throw new Error(data?.error || "Réponse de connexion invalide.");
    }

    const { error: sessionError } = await supabaseClient.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

    if (sessionError) throw sessionError;

    const profile = data.profile;
    const role = String(profile.role || "").toLowerCase();

    if (profile.is_active !== true) {
      await supabaseClient.auth.signOut();
      throw new Error("Votre compte est désactivé.");
    }

    if (data.must_change_password === true) {
      await supabaseClient.auth.signOut();
      throw new Error("Votre mot de passe doit être changé. Cette fonctionnalité sera ajoutée prochainement.");
    }

    if (
      ["admin", "administrateur", "administratrice"].includes(role)
    ) {
      document.querySelector(".container").innerHTML = `
        <h1>Bienvenue dans l'administration</h1>
        <p>${escapeHtml(profile.fullname || profile.username)}</p>
        <p>Accès administrateur</p>
        <button id="logoutButton" class="submit">Se déconnecter</button>
      `;
    } else if (role === "referent") {
      document.querySelector(".container").innerHTML = `
        <h1>Bienvenue</h1>
        <p>${escapeHtml(profile.fullname || profile.username)}</p>
        <p>Espace référent</p>
        <button id="logoutButton" class="submit">Se déconnecter</button>
      `;
    } else {
      await supabaseClient.auth.signOut();
      throw new Error("Votre rôle ne dispose pas encore d'un espace.");
    }

    document.getElementById("logoutButton").addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      window.location.reload();
    });

  } catch (error) {
    console.error("Erreur de connexion :", error.message);
    showMessage(error.message);
  } finally {
    if (document.getElementById("loginButton")) {
      button.disabled = false;
      button.textContent = "Se connecter";
    }
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}
