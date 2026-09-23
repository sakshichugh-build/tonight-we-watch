# Tonight We Watch

A two-person movie/TV matchmaker: each partner sets preferences independently, Gemini merges
both profiles (including free-text mood) into a search brief, TMDB supplies the candidate pool,
both partners swipe simultaneously, and a mutual like reveals exactly where to stream it in
India via RapidAPI's OTT Details API. Up to two rounds, then a shared top-5 fallback.
Everything is stored in Supabase so returning couples get better picks over time.

## 1. Accounts you need

- **Supabase** — https://supabase.com → new project → Project Settings → API for your URL/keys.
- **TMDB** — https://www.themoviedb.org/settings/api → generate a **v4 Read Access Token**.
- **RapidAPI** — subscribe to the [OTT details API](https://rapidapi.com/gox-ai-gox-ai-default/api/ott-details) (or swap `lib/streaming.ts` for a different one you already use). The Basic/free plan caps at **120 requests/month, 1 req/sec** — see the trade-off note below on why that's enough here.
- **Gemini** — https://aistudio.google.com/apikey → create an API key.
- **Vercel** — https://vercel.com → for hosting (needed so the QR code/link works from a real phone, not just localhost).

## 2. Database setup

Already applied for this project via the Supabase Management API — `supabase/schema.sql` created
all 8 tables, indexes, RLS policies, and enabled Realtime on `sessions`/`participants`. If you
ever need to re-run it (e.g. a fresh Supabase project), paste it into that project's SQL editor
and run it once; if the `alter publication` lines at the bottom error with "already a member",
Realtime is already on for those tables — check **Database → Replication** in the dashboard.

## 3. Environment variables

`.env.local` is already filled in with the Supabase/TMDB/RapidAPI/Gemini values you provided
(it's gitignored — never commit it). Since you shared these as plain text in chat, consider
rotating the Supabase service-role/secret key and the RapidAPI key at some point, since anything
pasted into a chat transcript should be treated as potentially exposed. The Supabase **access
token** (`sbp_...`) was used once to apply the schema and isn't stored anywhere in this project.

**Double-check the Gemini key once you run this** — `AQ.Ab8RN6...` doesn't match the usual
`AIzaSy...` shape of an AI Studio key, so if `npm run dev` throws an auth error on the
brief-generation step, regenerate one from https://aistudio.google.com/apikey and swap it into
`.env.local`.

## 4. Run locally

This machine didn't have Node.js installed when this project was scaffolded, so the install/build
below hasn't been run yet — do this first:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Note that QR scanning from a real phone won't work against
`localhost` — for that, deploy to Vercel (below) or use a tunnel like `ngrok http 3000` and set
`NEXT_PUBLIC_APP_URL` to the tunnel URL.

## 5. Deploy to Vercel

```bash
npx vercel
```

Then in the Vercel project's **Settings → Environment Variables**, add every variable from
`.env.local` (set `NEXT_PUBLIC_APP_URL` to the real `https://your-app.vercel.app` URL), and
redeploy. That URL is what the QR code and join links will use.

## How it works

See the code for specifics, but at a glance:

- `app/page.tsx` — Partner A fills preferences, creates a session.
- `app/session/[id]/join/page.tsx` — Partner B lands here from the QR/link and joins.
- `app/session/[id]/page.tsx` — the shared hub: renders the waiting screen, preference form,
  swipe deck, match reveal, or final top-5 screen depending on live session status (via
  Supabase Realtime), all from one URL both partners can bookmark/return to.
- `lib/orchestrate.ts` — the Gemini → TMDB → RapidAPI pipeline that builds each round's pool.
- `lib/matching.ts` — deterministic preference-merge rules, per-partner shuffle, scoring.
- `supabase/schema.sql` — full data model.

### A couple of intentional trade-offs

- **No user accounts.** The session UUID is the capability token, like a shareable doc link.
  This keeps the two-tap QR-join flow frictionless, at the cost of "whoever has the link can
  join" — fine for a private link shared partner-to-partner.
- **IMDb rating during swiping is TMDB's own `vote_average`, not true IMDb.** The RapidAPI OTT
  Details API bundles the real IMDb rating together with streaming links in one per-title call,
  but its free tier caps at 120 requests/month — enriching every ~30-40 pool candidate per round
  would exhaust that in 2-3 pool generations, ever. So RapidAPI is only called once per session,
  lazily, for whichever single title actually matches (or gets picked in the final top-5) —
  that's where the real IMDb rating and streaming links get fetched and shown. If you're on a
  paid RapidAPI tier and want real ratings/links on every swipe card, `lib/orchestrate.ts`'s
  `enrichAndSavePool` is where to add that call back in per candidate.
- **Returning-couple memory** is a lightweight opt-in: after a session, Partner A can save a
  "couple slug" to their own browser's `localStorage`; future sessions they create feed that
  couple's aggregated liked titles into Gemini's brief. It doesn't require any login.
