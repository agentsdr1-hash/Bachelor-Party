# Operation Bosphorus: Umang's Bachelor (Istanbul, Nov 14–22, 2026)

Crew hub for the trip: countdowns to the trip and the wedding, sealed daily dispatches, crew profiles, intel, itinerary with maps, challenges, photo vault, live polls and leaderboard.

- **Hosting:** Vercel (`public/` is the website, `api/` the server functions)
- **Logins:** controlled from GitHub in `crew.json`
- **Data and photos:** Supabase (free plan), used only as storage

## Who can sign in: `crew.json`

```json
{
  "crew": [
    { "crew": "abhi", "email": "abhishekdsouza93@gmail.com", "passwordHash": "pbkdf2$sha256$...", "organizer": true }
  ]
}
```

- `crew`: one of `umang`, `sagar`, `dev`, `abhi`, `nick` (whose profile, votes and points they get)
- `email`: what they type to sign in
- `passwordHash`: their password, hashed. Make one at **`https://<your-site>/tools/hash.html`** (runs on your phone; nothing is sent), or `node tools/hash-password.js "password"`.
- `organizer`: `true` for whoever writes the sealed personal messages and can unseal awards early

**Add a person:** add an entry → Commit. **Change a password:** replace their `passwordHash` → Commit. **Remove a person:** delete their entry → Commit; they lose access on the next sign-in by anyone. Vercel redeploys about 30 s after each commit.

Never write a plain password in this file. Keep the repository **private**: a hash of a short password like `test123` can be cracked in seconds by anyone who can read the file.

## One-time setup

### Supabase (storage)
1. Create a free project (region: Frankfurt).
2. SQL Editor → run `supabase/schema.sql`, then `supabase/002_invite_only.sql`. The emails inside `schema.sql` don't matter any more; `crew.json` overwrites them on sign-in.
3. Authentication → Sign In / Providers → turn off **Allow new users to sign up**.
4. Project Settings → API Keys: put the Project URL and the **publishable** key in `public/config.js`.

### Vercel
1. Import the GitHub repo. Root Directory: blank. Preset: Other.
2. Settings → Environment Variables:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_SECRET_KEY` = Supabase **secret** key (`sb_secret_…`). It lives only here, never in the repo.
3. Redeploy.

## How sign-in works
1. The site sends email + password to `api/login.js`.
2. It checks them against `crew.json`, syncs the crew list into Supabase, and opens a Supabase session for that person, using an internal password derived from the secret key that nobody needs to know.
3. All data access is then enforced by Supabase row-level security (`supabase/schema.sql`): only crew can read, you can only vote as yourself, only the organizer writes sealed messages, and photos sit in a private bucket behind signed links.

## Limits and risks
- Free Supabase projects pause after 7 days with no activity. Open the site weekly before the trip, or restore it from the dashboard.
- 1 GB file storage, 50 MB per upload. Keep long videos in a shared album.
- Passwords can only be changed by editing `crew.json`; people can't change their own.
- The itinerary, address and sealed dispatches are in the page code. The sign-in hides them from casual visitors, but they're readable to anyone who views the page source.

## Wedding countdown
Set in `public/config.js` (`weddingAt` with time zone offset, `weddingPlace`).
