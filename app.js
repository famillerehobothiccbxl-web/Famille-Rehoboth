
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

async function verifierConnexion() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id")
    .limit(1);

  if (error) {
    console.error("Erreur Supabase :", error.message);
    return;
  }

  console.log("Connexion Supabase réussie !");
}

verifierConnexion();
