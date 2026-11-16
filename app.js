
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  loginButton.disabled = true;
  loginButton.textContent = "Connexion en cours...";
  loginMessage.textContent = "";

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "gestion-comptes",
      {
        body: {
          action: "login",
          username: username,
          password: password
        }
      }
    );

    if (error) {
      throw error;
    }

    if (!data || !data.session || !data.profile) {
      throw new Error("Réponse de connexion invalide.");
    }

    const { error: sessionError } = await supabaseClient.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

    if (sessionError) {
      throw sessionError;
    }

    const profile = data.profile;
    const role = String(profile.role || "").toLowerCase();

    if (profile.is_active !== true) {
      throw new Error("Ce compte est désactivé.");
    }

    if (data.must_change_password === true) {
      loginMessage.textContent =
        "Votre mot de passe doit être changé. Cette étape sera configurée ensuite.";
      await supabaseClient.auth.signOut();
      return;
    }

    if (
      role === "admin" ||
      role === "administrateur" ||
      role === "administratrice"
    ) {
      document.querySelector(".container").innerHTML = `
        <h1>Bienvenue dans l'administration</h1>
        <p>${escapeHtml(profile.fullname || profile.username)}</p>
        <p>Accès administrateur</p>
        <button id="logoutButton">Se déconnecter</button>
      `;
    } else if (role === "referent") {
      document.querySelector(".container").innerHTML = `
        <h1>Bienvenue</h1>
        <p>${escapeHtml(profile.fullname || profile.username)}</p>
        <p>Espace référent</p>
        <button id="logoutButton">Se déconnecter</button>
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
    loginMessage.textContent =
      "Connexion impossible : vérifiez votre identifiant et votre mot de passe.";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Se connecter";
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character];
  });
}
