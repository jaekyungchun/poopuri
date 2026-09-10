# poopuri 🎧

A tiny **shared** music player PWA — just for you and jj. Drag songs onto
the app from your laptop; they upload to your own cloud storage and show up on
both your phones. Add it to your home screen and it runs like a real app.

- **Add songs:** drag-and-drop onto the app (or tap **add** to pick files).
- **Shared:** both devices see the same library (stored in Cloudflare R2).
- **Plays anywhere + offline:** open the URL, tap a song. Lock-screen controls work.

---

## One-time setup (do this once)

Songs live in a **Cloudflare R2** bucket (10 GB free, no egress fees). You set up
the bucket, paste a few keys into Vercel, and redeploy.

### 1. Create the R2 bucket
1. Make a free account at [cloudflare.com](https://dash.cloudflare.com) → **R2**.
2. **Create bucket** → name it `poopuri` → Create.
3. Open the bucket → **Settings** → **Public access** → enable the
   **r2.dev public URL** (it warns it's public — fine for a personal library).
   Copy that URL, e.g. `https://pub-xxxxxxxx.r2.dev` — that's your `R2_PUBLIC_BASE`.
4. Still in **Settings** → **CORS policy** → add this (lets the app upload & cache):

   ```json
   [
     {
       "AllowedOrigins": ["https://poopuri.vercel.app", "http://localhost:4180"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges", "ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   (Use your real poopuri URL if it isn't `poopuri.vercel.app`.)

### 2. Make an R2 API token
1. R2 → **Manage R2 API Tokens** → **Create API token**.
2. Permissions: **Object Read & Write**, scoped to the `poopuri` bucket → Create.
3. Copy the **Access Key ID** and **Secret Access Key** (shown once).
   Your **Account ID** is on the R2 overview page.

### 3. Put the keys in Vercel
In your Vercel **poopuri** project → **Settings → Environment Variables**, add:

| Name | Value |
|------|-------|
| `R2_ACCOUNT_ID` | your Cloudflare account id |
| `R2_ACCESS_KEY_ID` | the token's access key id |
| `R2_SECRET_ACCESS_KEY` | the token's secret |
| `R2_BUCKET` | `poopuri` |
| `R2_PUBLIC_BASE` | the r2.dev URL from step 1.3 |

### 4. Redeploy
Push any change, or in Vercel → **Deployments → ⋯ → Redeploy**. Done —
open poopuri and start adding songs.

---

## Everyday use

1. Open your poopuri URL (laptop or phone).
2. **Drag song files onto the window**, or tap **add** to pick them.
   - Name them `Artist - Title.mp3` and poopuri splits out artist + title.
   - **MP3 / M4A only**, under 25 MB each — FLAC/WAV are blocked (too big for a
     phone library, and they can't be told apart on earbuds anyway).
3. They upload and appear on both devices. Tap one to play.
4. To remove a song, tap the 🗑 on its row (removes it for both of you).

### Put it on your phone
Open the URL in the phone browser → **Add to Home Screen** (iPhone: Share menu;
Android: ⋮ menu → Install app). Launch it from the icon for full-screen + lock-screen controls.

---

## Good to know

- **Works offline.** Each song is quietly saved onto your device the first time
  the app sees it online (pink ✓ on a row = "saved for offline"). After that it
  plays with no connection, and the app opens offline too. The cloud stays the
  shared source of truth, so a song added on the laptop appears on the phone the
  next time the phone is online — then it caches there as well.
- **It's unlisted, not locked.** Anyone with the exact URL (or a song's public
  R2 link) could open/stream it. It's meant for just the two of you — don't post
  the link. (Want a password? Say so and I'll add one.)
- **Only upload music you own / have the right to use.**
- R2's free tier is 10 GB — plenty for an MP3 library. The 25 MB / no-FLAC limit
  keeps you well inside it and keeps offline caching practical.

---

## Preview locally (optional)

```bash
node serve.mjs
```

Opens <http://localhost:4180>. Locally the whole flow (upload, list, play,
delete, offline) is mocked against a `.devsongs/` folder — no cloud needed.

---

## Files

| File | What it does |
|------|--------------|
| `index.html` | The whole player — HTML, CSS, JS in one file. |
| `api/_r2.js` | Shared Cloudflare R2 (S3) client + helpers. |
| `api/upload.js` | Hands the browser a presigned URL to upload straight to R2. |
| `api/songs.js` | Lists the library (GET) and removes songs (DELETE). |
| `sw.js` | Service worker: installable + offline app shell. |
| `manifest.webmanifest` | App name/icons for "Add to Home Screen". |
| `package.json` | Declares the AWS S3 SDK (used to talk to R2). |
| `genIcons.mjs` | Regenerates the app icons from one SVG (rarely needed). |
| `serve.mjs`, `.devsongs/` | Local preview only — excluded from deploys. |

If you change `index.html` or `sw.js` and a phone shows a stale version, bump
`const CACHE` in `sw.js`.
