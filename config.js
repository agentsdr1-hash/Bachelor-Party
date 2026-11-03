// Supabase project settings (Supabase → Project Settings → API Keys).
// The publishable key is designed to be public; access is enforced by the
// row-level security policies in supabase/schema.sql.
// Never put the secret / service_role key here.
window.BP_CONFIG = {
  supabaseUrl: "https://heffyvaqtzvtnuuhuocp.supabase.co",
  supabaseAnonKey: "sb_publishable_XthCeMt8d-Z5q0sV2HoD3g_uW3V3yd3",
};

// Wedding countdown on the Mission page. Use the wedding's local time with
// its UTC offset, e.g. "2027-02-14T18:00:00+05:30". Leave "" to show "Date to be announced".
window.BP_CONFIG.weddingAt = "";
window.BP_CONFIG.weddingPlace = "";
