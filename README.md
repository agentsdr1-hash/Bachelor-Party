# Operation Bosphorus: Umang's Bachelor (Istanbul, Nov 14–22, 2026)

Trip site for the crew: a home page with both countdowns, what's next on the plan, the route and the trip in numbers; the day-by-day plan; a map of every stop; crew profiles; live polls; and essentials (flights, base, packing, bookings, ideas backlog). Challenges, the photo vault and the leaderboard are built but hidden (`HIDDEN` in `route()`).

- **Hosting:** Vercel serves `public/` (plain HTML, no build)
- **Data and photos:** Supabase (free plan)
- **No sign-in:** anyone with the link opens the site and taps **Who are you?** to pick their name. Votes, uploads and points are signed with that name on that device.

## Setup

### Supabase
1. SQL Editor → run `supabase/schema.sql`, then `supabase/003_open_access.sql`.
   (`002_invite_only.sql` is from the old login version and is optional.)
2. Project Settings → API Keys: the Project URL and **publishable** key go in `public/config.js` (already set).

### Vercel
Import the repo. Root Directory: blank. Preset: Other. No environment variables are needed.

## Settings in `public/config.js`
- `organizer`: crew member who gets organizer tools (sealed personal messages, unseal awards early). Currently `abhi`.
- `weddingAt`, `weddingPlace`, `weddingTz`: wedding countdown.

## Risks of no sign-in
- Anyone with the link can read everything (itinerary, Airbnb address, flights, photos) and can vote, upload, delete or claim points as anyone. Share the link only in the crew chat.
- The URL is excluded from search engines (`noindex`), but forwarded links can't be recalled.
- Photos stay in a private bucket and open through signed links, which can be forwarded.
- Free Supabase projects pause after 7 days with no activity; open the site weekly before the trip.
- 1 GB file storage, 50 MB per upload.
