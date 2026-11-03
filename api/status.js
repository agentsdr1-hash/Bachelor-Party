// Setup check: open https://<your-site>/api/status in a browser.
// Reports what is configured and what is failing. Never returns keys, hashes or emails.
const CREW_FILE = require("../crew.json");

const URL_ = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY || "";
const KEYS = ["umang", "sagar", "dev", "abhi", "nick"];

function headers() {
  const h = {apikey: KEY};
  if (KEY.startsWith("eyJ")) h.authorization = "Bearer " + KEY;
  return h;
}
async function probe(path) {
  try {
    const r = await fetch(URL_ + path, {headers: headers()});
    const t = await r.text();
    let msg = ""; try { const j = JSON.parse(t); msg = j.message || j.msg || j.error_description || j.error || ""; } catch {}
    return {ok: r.ok, status: r.status, detail: r.ok ? "ok" : String(msg || t).slice(0, 200)};
  } catch (e) { return {ok: false, status: 0, detail: "Can't reach Supabase: " + e.message}; }
}

module.exports = async (req, res) => {
  res.setHeader("cache-control", "no-store");
  const checks = [];
  const add = (name, ok, detail, fix) => checks.push({check: name, ok, detail, ...(ok ? {} : {fix})});

  // 1. crew.json
  const list = Array.isArray(CREW_FILE.crew) ? CREW_FILE.crew : [];
  const bad = list.filter(c => !KEYS.includes(String(c.crew || "").toLowerCase()) || !/@/.test(c.email || "") || !/^pbkdf2\$sha256\$\d+\$[^$]+\$[^$]+$/.test(c.passwordHash || ""));
  add("crew.json", list.length > 0 && bad.length === 0,
    `${list.length} people listed: ${list.map(c => c.crew).join(", ") || "none"}${bad.length ? `; ${bad.length} entries have a wrong crew name, email or passwordHash` : ""}`,
    "Each entry needs crew (umang/sagar/dev/abhi/nick), email, and a passwordHash from /tools/hash.html.");
  add("organizer in crew.json", list.some(c => c.organizer === true), list.some(c => c.organizer === true) ? "yes" : "nobody has organizer: true", "Set \"organizer\": true on one entry.");

  // 2. Vercel environment variables
  add("SUPABASE_URL set", !!URL_ && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(URL_), URL_ ? "set" : "missing",
    "Vercel → Settings → Environment Variables → add SUPABASE_URL = https://<ref>.supabase.co, then Redeploy.");
  const keyKind = KEY.startsWith("sb_secret_") ? "secret key" : KEY.startsWith("eyJ") ? "legacy service_role key (assumed)" : KEY.startsWith("sb_publishable_") ? "PUBLISHABLE key (wrong one)" : KEY ? "unrecognised" : "missing";
  add("SUPABASE_SECRET_KEY set", /secret key|service_role/.test(keyKind), keyKind,
    "Vercel → Settings → Environment Variables → SUPABASE_SECRET_KEY = the sb_secret_… key from Supabase → Project Settings → API Keys (not the publishable key), then Redeploy.");

  if (URL_ && KEY) {
    // 3. Supabase pieces
    const crew = await probe("/rest/v1/crew_members?select=crew_key,email,is_owner&limit=1");
    add("Supabase: crew_members table", crew.ok, crew.detail, "Run supabase/schema.sql in the Supabase SQL Editor.");
    const docs = await probe("/rest/v1/docs?select=coll&limit=1");
    add("Supabase: docs table", docs.ok, docs.detail, "Run supabase/schema.sql in the Supabase SQL Editor.");
    try {
      const r = await fetch(URL_ + "/auth/v1/settings", {headers: headers()});
      const s = r.ok ? await r.json() : {};
      add("Supabase: email sign-in enabled", !!(s.external && s.external.email), r.ok ? (s.external && s.external.email ? "on" : "OFF") : "couldn't read auth settings (" + r.status + ")",
        "Supabase → Authentication → Sign In / Providers → Email: switch it ON (keep 'Allow new users to sign up' off). The site needs it to open sessions.");
    } catch (e) { add("Supabase: email sign-in enabled", false, "couldn't read auth settings: " + e.message, "Check SUPABASE_URL."); }
    const admin = await probe("/auth/v1/admin/users?page=1&per_page=1");
    add("Supabase: can manage logins", admin.ok, admin.detail, "SUPABASE_SECRET_KEY must be the secret (service_role) key, and SUPABASE_URL must match the same project.");
  }

  const ok = checks.every(c => c.ok);
  res.status(200).json({ready: ok, checks});
};
