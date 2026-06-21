# Piece 1 — Supabase Setup

Do these in order. Should take about 10 minutes.

## 1. Create the project
If you haven't already: go to supabase.com → New Project. Pick any name/region/password. Wait ~2 min for it to spin up.

## 2. Run the schema
- Open your project → **SQL Editor** (left sidebar) → **New query**
- Paste in everything from `schema.sql` (in this same folder)
- Click **Run**
- You should see "Success. No rows returned." If you get an error, stop and paste it back to me.

## 3. Create two storage buckets
Left sidebar → **Storage** → **New bucket**

| Bucket name    | Public? |
|----------------|---------|
| `screenshots`  | No (private) |
| `exports`      | No (private) |

Leave everything else default. We'll generate signed (temporary) download links from the worker later — that's safer than making them public.

## 4. Grab your keys
Left sidebar → **Project Settings** → **API**. Note down these three (you'll paste them into Render and Vercel later, never into a public repo):

- **Project URL** — looks like `https://xxxxxxxx.supabase.co`
- **anon public key** — goes in the *frontend* (safe to expose, RLS protects it)
- **service_role key** — goes ONLY in the *Render worker*, never in the frontend. This key bypasses RLS completely.

## 5. Quick sanity check
Table Editor (left sidebar) → you should see two empty tables: `jobs` and `job_screenshots`. That's it — piece 1 done.

---
Once you've got those 3 keys saved somewhere, tell me and we'll build **Piece 2: the Render worker** — the actual screenshot agent that does the real work (visits the URL, captures sections, zips them, uploads to Supabase, updates the job row).
