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
window.BP_CONFIG.weddingAt = "2026-12-19T00:00:00+07:00";  // Hua Hin local time (UTC+7). Add the ceremony time when known.
window.BP_CONFIG.weddingPlace = "Hua Hin, Thailand";
window.BP_CONFIG.weddingTz = "Asia/Bangkok";  // shows the wedding date as it is in Hua Hin
