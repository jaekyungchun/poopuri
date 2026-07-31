# poopuri 🎧

A tiny **shared** music player PWA — just for you and jj. Drag songs onto
the app from your laptop; they upload to your own private cloud storage and
show up on both your phones. Add it to your home screen and it runs like a
real app.

- **Add songs:** drag-and-drop onto the app (or tap **add** to pick files).
- **Shared:** both devices see the same library (stored in your Vercel Blob).
- **Plays anywhere:** open the URL, tap a song. Lock-screen controls work.

---

## One-time setup (do this once)

You need a free **Vercel Blob** store — that's where the songs live.

1. **Deploy the app first** so the project exists in Vercel. From this folder:

   ```bash
   npx vercel
   ```

   Accept the defaults (it's a static app with an `api/` folder — no build
   command). This creates the project and gives you a preview URL.

2. **Create the Blob store and link it:**
   - Go to your project on [vercel.com](https://vercel.com) → **Storage** tab
     → **Create Database** → **Blob** → give it any name → **Create**.
   - When it asks, **connect it to this project**. That automatically adds the
     `BLOB_READ_WRITE_TOKEN` environment variable — you don't copy anything by hand.

3. **Deploy for real:**

   ```bash
   npx vercel --prod
   ```

   The `--prod` URL it prints is your stable poopuri link. Reuse it forever.

> That's it. There's no folder to update and nothing to redeploy when you add
> songs — the app talks to your Blob store directly.

---

## Everyday use

1. Open your poopuri URL (laptop or phone).
2. **Drag song files onto the window**, or tap **add** to pick them.
   - Name them `Artist - Title.mp3` and poopuri splits out artist + title.
   - Best formats for phones: **`.mp3`** or **`.m4a`**.
3. They upload and appear on both devices. Tap one to play.
4. To remove a song, tap the 🗑 on its row (removes it for both of you).

### Put it on your phone
Open the URL in the phone browser → **Add to Home Screen** (iPhone: Share menu;
Android: ⋮ menu → Install app). Launch it from the icon for full-screen + lock-screen controls.

---

## Good to know

- **It's unlisted, not locked.** Anyone who has your exact URL could open it and
  add/remove songs. It's meant for just the two of you — don't post the link
  publicly. (If you ever want a password on it, say so and I'll add one.)
- **Playing a song needs internet** (it streams from your cloud library). The app
  screen itself works offline once installed.
- **Only upload music you own / have the right to use.** It's your private storage.
- Vercel Blob's free tier is generous, but it isn't unlimited — it's sized for a
  personal library, not thousands of albums.

---

## Preview locally (optional)

```bash
node serve.mjs
```

Opens <http://localhost:4180>. Locally the **upload** button won't work (uploads
go straight to Vercel Blob, which only exists on the deploy) — to see songs in
the list while testing, drop files into the `.devsongs/` folder instead.

---

## Files

| File | What it does |
|------|--------------|
| `index.html` | The whole player — HTML, CSS, JS in one file. |
| `api/upload.js` | Hands the browser a token to upload straight to Blob. |
| `api/songs.js` | Lists the library (GET) and removes songs (DELETE). |
| `sw.js` | Service worker: installable + offline app shell. |
| `manifest.webmanifest` | App name/icons for "Add to Home Screen". |
| `package.json` | Declares the `@vercel/blob` dependency. |
| `genIcons.mjs` | Regenerates the app icons from one SVG (rarely needed). |
| `serve.mjs`, `.devsongs/` | Local preview only — excluded from deploys. |

If you change `index.html` or `sw.js` and a phone shows a stale version, bump
`const CACHE = "poopuri-v2"` in `sw.js`.
