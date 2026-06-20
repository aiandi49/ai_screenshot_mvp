# Piece 2 — Render Worker Setup

This is the actual engine: visits a URL, screenshots each section, zips it, uploads to Supabase, updates the job row. The LLM step is a stub for now (Piece 3).

## 1. Push this to GitHub
If `ai-and-i-app` isn't a git repo yet:
```
cd ai-and-i-app
git init
git add .
git commit -m "Piece 1 + Piece 2"
git branch -M main
git remote add origin <your GitHub repo URL>
git push -u origin main
```

## 2. Create the Render service
- Render dashboard → **New** → **Web Service**
- Connect your GitHub repo
- **Root Directory:** `worker` (important — this is a subfolder of the repo)
- **Environment / Runtime:** **Docker** (Render will auto-detect the `Dockerfile`, no build/start commands needed)
- **Plan:** Starter ($7/mo) recommended over Free — headless Chromium is memory-hungry and the free tier's 512MB can be tight, plus free services spin down when idle and would miss jobs

## 3. Set environment variables
In the Render service → **Environment**, add:

| Key | Value |
|---|---|
| `SUPABASE_URL` | `https://hgbiuqkjozruytgsdinc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | (paste the real secret here — **only** here, never in git) |

## 4. Deploy
Click **Create Web Service**. First build takes a few minutes (it's pulling the Playwright image). Watch the logs for:
```
[server] listening on port 10000
[poller] started — checking every 5s
```

Visit `https://your-service.onrender.com/health` — should return `{"ok":true,"service":"ai-and-i-worker"}`.

## 5. Test it end-to-end
In Supabase → Table Editor → `jobs` → Insert row:
- `url`: any public site, e.g. `https://stripe.com`
- leave everything else default (`status` defaults to `pending`)

Watch the Render logs — within ~5 seconds you should see:
```
[job <uuid>] starting — https://stripe.com
[job <uuid>] done — N sections captured
```

Then check Supabase → Storage → `screenshots` and `exports` buckets — the PNGs and zip should be there. And the `jobs` row should now show `status: done`, a `zip_path`, and a stubbed `result`.

---
Once that test job completes successfully, Piece 2 is done. Next up: **Piece 3**, swapping the LLM stub for a real provider, and **Piece 4**, the actual Vercel frontend.
