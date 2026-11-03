// Vercel serverless function: crew access management for the organizer.
// Needs two Vercel environment variables (Project → Settings → Environment Variables):
//   SUPABASE_URL         https://<ref>.supabase.co
//   SUPABASE_SECRET_KEY  sb_secret_... (or the legacy service_role key). Never put this in the page.
// Every request must carry the caller's Supabase session token, and the caller
// must be marked is_owner in crew_members.
const crypto = require("crypto");

const CREW = ["umang", "sagar", "dev", "abhi", "nick"];
const URL_ = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY || "";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WORDS = ["kebab","ferry","simit","tulip","bazaar","minaret","raki","cistern","galata","kumpir","sultan","lokum","tavla","hamam","meyhane","bosphorus"];

function adminHeaders(extra = {}) {
  const h = {apikey: KEY, "content-type": "application/json", ...extra};
  if (KEY.startsWith("eyJ")) h.authorization = "Bearer " + KEY; // legacy JWT keys
  return h;
}
async function sb(path, opts = {}) {
  const r = await fetch(URL_ + path, {...opts, headers: adminHeaders(opts.headers)});
  const text = await r.text();
  let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) {
    const msg = (body && (body.msg || body.message || body.error_description || body.error)) || ("Supabase error " + r.status);
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg)); err.status = r.status; throw err;
  }
  return body;
}
function tempPassword() {
  const w = WORDS[crypto.randomInt(WORDS.length)];
  const w2 = WORDS[crypto.randomInt(WORDS.length)];
  return `${w[0].toUpperCase()}${w.slice(1)}-${crypto.randomInt(1000, 10000)}-${w2}`;
}
async function callerEmail(token) {
  const r = await fetch(URL_ + "/auth/v1/user", {headers: {apikey: KEY, authorization: "Bearer " + token}});
  if (!r.ok) return null;
  const u = await r.json();
  return (u && u.email || "").toLowerCase() || null;
}
async function allUsers() {
  const out = [];
  for (let page = 1; page < 20; page++) {
    const b = await sb(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const users = (b && b.users) || [];
    out.push(...users);
    if (users.length < 200) break;
  }
  return out;
}
const crewRows = () => sb("/rest/v1/crew_members?select=crew_key,email,is_owner,password_set");

module.exports = async (req, res) => {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") return res.status(405).json({error: "Use POST."});
  if (!URL_ || !KEY) return res.status(500).json({error: "The server isn't set up yet: add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel, then redeploy."});
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const me = token && await callerEmail(token);
    if (!me) return res.status(401).json({error: "Your session expired. Sign in again."});
    const rows = await crewRows();
    const mine = rows.find(r => r.email === me);
    if (!mine || !mine.is_owner) return res.status(403).json({error: "Only the organizer can manage crew access."});

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const {action} = body;
    const key = String(body.crew_key || "");
    if (action !== "list" && !CREW.includes(key)) return res.status(400).json({error: "Unknown crew member."});

    const users = await allUsers();
    const userFor = email => users.find(u => (u.email || "").toLowerCase() === (email || "").toLowerCase());

    if (action === "list") {
      return res.json({crew: CREW.map(k => {
        const row = rows.find(r => r.crew_key === k) || {};
        const u = row.email && userFor(row.email);
        return {crew_key: k, email: row.email && !/@example\.com$/.test(row.email) ? row.email : "", is_owner: !!row.is_owner,
          status: !u ? "no-login" : row.password_set ? "active" : "invited",
          last_sign_in: u && u.last_sign_in_at || null};
      })});
    }

    const row = rows.find(r => r.crew_key === key);

    if (action === "invite") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) return res.status(400).json({error: "That doesn't look like an email address."});
      if (row && row.email === me) return res.status(400).json({error: "That's your own login. Change your password from the account menu."});
      const clash = rows.find(r => r.email === email && r.crew_key !== key);
      if (clash) return res.status(409).json({error: `That email is already used by ${clash.crew_key}.`});
      const oldUser = row && row.email !== email ? userFor(row.email) : null;
      const existing = userFor(email);
      // Crew list first, so the sign-up guard trigger accepts the new login.
      await sb("/rest/v1/crew_members?on_conflict=crew_key", {method: "POST",
        headers: {prefer: "resolution=merge-duplicates,return=minimal"},
        body: JSON.stringify({crew_key: key, email, password_set: false})});
      const password = tempPassword();
      if (existing) {
        await sb(`/auth/v1/admin/users/${existing.id}`, {method: "PUT", body: JSON.stringify({password, email_confirm: true})});
        if (oldUser && oldUser.id !== existing.id) await sb(`/auth/v1/admin/users/${oldUser.id}`, {method: "DELETE"});
      } else if (oldUser) {
        await sb(`/auth/v1/admin/users/${oldUser.id}`, {method: "PUT", body: JSON.stringify({email, password, email_confirm: true})});
      } else {
        await sb("/auth/v1/admin/users", {method: "POST", body: JSON.stringify({email, password, email_confirm: true})});
      }
      return res.json({ok: true, email, password});
    }

    if (action === "reset") {
      const u = row && userFor(row.email);
      if (!u) return res.status(404).json({error: "No login exists for this person yet. Use Send invite."});
      if (row.email === me) return res.status(400).json({error: "Change your own password from the account menu instead."});
      const password = tempPassword();
      await sb(`/auth/v1/admin/users/${u.id}`, {method: "PUT", body: JSON.stringify({password})});
      await sb(`/rest/v1/crew_members?crew_key=eq.${key}`, {method: "PATCH", headers: {prefer: "return=minimal"}, body: JSON.stringify({password_set: false})});
      return res.json({ok: true, email: row.email, password});
    }

    if (action === "revoke") {
      if (row && row.email === me) return res.status(400).json({error: "You can't remove your own access."});
      const u = row && userFor(row.email);
      if (u) await sb(`/auth/v1/admin/users/${u.id}`, {method: "DELETE"});
      await sb(`/rest/v1/crew_members?crew_key=eq.${key}`, {method: "PATCH", headers: {prefer: "return=minimal"},
        body: JSON.stringify({email: `${key}@example.com`, password_set: false})});
      return res.json({ok: true});
    }

    return res.status(400).json({error: "Unknown action."});
  } catch (e) {
    return res.status(e.status && e.status < 500 ? 400 : 500).json({error: e.message || "Something went wrong."});
  }
};
