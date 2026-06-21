# AI&I — Screenshot Agent

AI&I visits a URL, captures every section of the page as a screenshot, zips them up, and (soon) feeds them to an LLM to generate copy, wireframes, and other outputs.

## Repo structure

This is a monorepo — each top-level folder is a separate piece that deploys somewhere different:

| Folder | What it is | Deploys to |
|---|---|---|
| `supabase/` | Database schema, RLS policies, storage bucket setup. Run once, manually, in the Supabase SQL editor — not auto-deployed. | Supabase |
| `worker/` | The actual screenshot agent: Playwright capture → zip → upload → job status updates | Render |
| `web/` | *(coming soon — Piece 4)* the public site / dashboard | Vercel |

## Status

- ✅ **Piece 1** — Supabase schema, RLS, storage buckets
- ✅ **Piece 2** — Render worker (screenshot capture → zip → upload)
- ⏳ **Piece 3** — real LLM output generation (currently stubbed in `worker/src/llmStub.js`)
- ⏳ **Piece 4** — Vercel frontend

## Stack

GitHub (source) → Vercel (frontend) + Render (worker) + Supabase (database/storage) + Resend (email)
