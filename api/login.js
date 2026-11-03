// Vercel serverless function: sign in against crew.json (the GitHub-controlled crew list).
//
// crew.json decides who can sign in and with which password. Supabase only stores
// the data; each crew member's Supabase account is created and kept in sync here,
// with an internal password nobody needs to know.
//
// Vercel environment variables (Project → Settings → Environment Variables):
//   SUPABASE_URL         https://<ref>.supabase.co
//   SUPABASE_SECRET_KEY  sb_secret_... (or the legacy service_role key). Never put this in the page.
const crypto = require("crypto");
const {verifyPassword} = require("./_password");
const CREW_FILE = require("../crew.json");

const KEYS = ["umang", "sagar", "dev", "abhi", "nick"];
const URL_ = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY || "";

function headers(extra = {}) {
  const h = {apikey: KEY, "content-type": "application/json", ...extra};
  if (KEY.startsWith("eyJ")) h.authorization = "Bearer " + KEY; // legacy JWT keys
  return h;
}
async function sb(path, opts = {}) {
  const r = await fetch(URL_ + path, {...opts, headers: headers(opts.headers)});
  const text = await r.text();
  let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) {
    const msg = (body && (body.msg || body.message || body.error_description || body.error)) || ("Supabase error " + r.status);
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg)); err.status = r.status; throw err;
  }
  return body;
}

// Normalised crew list from crew.json; entries without an email are ignored.
function crewList() {
  const list = Array.isArray(CREW_FILE.crew) ? CREW_FILE.crew : [];
  return list
    .map(c => ({crew: String(c.crew || "").toLowerCase(), email: String(c.email || "").trim().toLowerCase(), passwordHash: c.passwordHash || "", organizer: !!c.organizer}))
    .filter(c => KEYS.includes(c.crew) && c.email);
}

// Make crew_members match crew.json exactly (who is on the crew, who is organizer).
async function syncCrewMembers(list) {
  const rows = await sb("/rest/v1/crew_members?select=crew_key,email,is_owner");
  const want = Object.fromEntries(KEYS.map(k => {
    const c = list.find(x => x.crew === k);
    return [k, {email: c ? c.email : `${k}@example.com`, is_owner: c ? c.organizer : false}];
  }));
  const changed = KEYS.filter(k => {
    const r = rows.find(x => x.crew_key === k);
    return !r || r.email !== want[k].email || !!r.is_owner !== want[k].is_owner;
  });
  if (!changed.length) return;
  // Park changed rows on placeholder emails first, so an email can move between people.
  for (const k of changed) {
    if (rows.find(x => x.crew_key === k)) {
      await sb(`/rest/v1/crew_members?crew_key=eq.${k}`, {method: "PATCH", headers: {prefer: "return=minimal"},
        body: JSON.stringify({email: `${k}@example.com`})});
    }
  }
  for (const k of changed) {
    await sb("/rest/v1/crew_members?on_conflict=crew_key", {method: "POST",
      headers: {prefer: "resolution=merge-duplicates,return=minimal"},
      body: JSON.stringify({crew_key: k, email: want[k].email, is_owner: want[k].is_owner})});
  }
}

// Internal Supabase password: derived from the secret key, so it is stable and never stored.
const internalPassword = email => crypto.createHmac("sha256", KEY).update("bp-login:" + email).digest("base64url");

async function findUser(email) {
  for (let page = 1; page < 20; page++) {
    const b = await sb(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const users = (b && b.users) || [];
    const u = users.find(x => (x.email || "").toLowerCase() === email);
    if (u || users.length < 200) return u || null;
  }
  return null;
}
async function passwordGrant(email, password) {
  const r = await fetch(URL_ + "/auth/v1/token?grant_type=password", {method: "POST", headers: headers(), body: JSON.stringify({email, password})});
  if (!r.ok) return null;
  return r.json();
}
async function supabaseSession(email) {
  const pw = internalPassword(email);
  let s = await passwordGrant(email, pw);
  if (s) return s;
  const u = await findUser(email);
  if (u) await sb(`/auth/v1/admin/users/${u.id}`, {method: "PUT", body: JSON.stringify({password: pw, email_confirm: true})});
  else await sb("/auth/v1/admin/users", {method: "POST", body: JSON.stringify({email, password: pw, email_confirm: true})});
  s = await passwordGrant(email, pw);
  if (!s) throw new Error("Couldn't open a session. Check the Supabase settings in Vercel.");
  return s;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = async (req, res) => {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") return res.status(405).json({error: "Use POST."});
  if (!URL_ || !KEY) return res.status(500).json({error: "The server isn't set up yet: add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel, then redeploy."});
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const list = crewList();
    const me = list.find(c => c.email === email);
    if (!me || !verifyPassword(password, me.passwordHash)) {
      await sleep(600 + Math.floor(Math.random() * 400)); // slow down guessing
      return res.status(401).json({error: "Wrong email or password."});
    }
    await syncCrewMembers(list);
    const s = await supabaseSession(email);
    return res.json({access_token: s.access_token, refresh_token: s.refresh_token, crew: me.crew});
  } catch (e) {
    return res.status(500).json({error: e.message || "Sign-in failed. Try again."});
  }
};
