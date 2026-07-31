/* Local dev server for poopuri.
   In production, Vercel serves the static files and runs /api/*.
   This little server does two things so you can preview locally:
     • serves the app shell (with HTTP range support for seeking)
     • MOCKS the song library from a local ".devsongs/" folder, so
       GET/DELETE /api/songs behave like the real cloud API.
   The real UPLOAD path (drag-drop) talks directly to Vercel Blob and
   only works on a deploy — locally, drop files into ".devsongs/" to
   see them in the list. Run:  node serve.mjs
*/
import { createServer } from "node:http";
import { createReadStream, statSync, readdirSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, normalize, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DEV_SONGS = resolve(ROOT, ".devsongs");
const PORT = process.env.PORT || 4180;
const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
  ".png": "image/png", ".mp3": "audio/mpeg", ".m4a": "audio/mp4",
  ".aac": "audio/aac", ".ogg": "audio/ogg", ".oga": "audio/ogg",
  ".opus": "audio/ogg", ".wav": "audio/wav", ".flac": "audio/flac",
  ".webm": "audio/webm",
};

function pretty(name) {
  const stem = name.replace(AUDIO_EXT, "");
  const cleaned = stem.replace(/^\s*\d{1,3}\s*[-.)]?\s+/, "").trim();
  const dash = cleaned.split(/\s+-\s+/);
  if (dash.length >= 2) return { artist: dash[0].trim(), title: dash.slice(1).join(" - ").trim() || stem };
  return { artist: "", title: cleaned || stem };
}

function streamFile(file, req, res) {
  let st;
  try { st = statSync(file); } catch { res.writeHead(404).end("not found"); return; }
  const type = TYPES[extname(file).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? parseInt(m[2], 10) : st.size - 1;
    res.writeHead(206, {
      "Content-Type": type, "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${st.size}`, "Content-Length": end - start + 1,
    });
    createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { "Content-Type": type, "Content-Length": st.size, "Accept-Ranges": "bytes" });
    createReadStream(file).pipe(res);
  }
}

if (!existsSync(DEV_SONGS)) mkdirSync(DEV_SONGS, { recursive: true });

createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  const path = decodeURIComponent(u.pathname);

  // --- mock API: song library ---
  if (path === "/api/songs") {
    if (req.method === "GET") {
      const songs = readdirSync(DEV_SONGS).filter((f) => AUDIO_EXT.test(f)).map((f) => {
        const p = pretty(f);
        return { url: "/devsongs/" + encodeURIComponent(f), name: f, title: p.title, artist: p.artist,
          size: statSync(resolve(DEV_SONGS, f)).size, uploadedAt: statSync(resolve(DEV_SONGS, f)).mtime.toISOString() };
      });
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ songs }));
      return;
    }
    if (req.method === "DELETE") {
      const url = u.searchParams.get("url") || "";
      const name = basename(decodeURIComponent(url));
      try { unlinkSync(resolve(DEV_SONGS, name)); res.writeHead(200).end('{"ok":true}'); }
      catch { res.writeHead(404).end('{"error":"not found"}'); }
      return;
    }
    res.writeHead(405).end('{"error":"GET or DELETE"}');
    return;
  }
  if (path === "/api/upload") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"error":"local mock: drop files into .devsongs/ instead"}');
    return;
  }

  // --- dev song files ---
  if (path.startsWith("/devsongs/")) {
    const file = normalize(resolve(DEV_SONGS, "." + path.slice("/devsongs".length)));
    if (!file.startsWith(DEV_SONGS)) { res.writeHead(403).end(); return; }
    streamFile(file, req, res);
    return;
  }

  // --- static app shell ---
  let p = path === "/" ? "/index.html" : path;
  const file = normalize(resolve(ROOT, "." + p));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  streamFile(file, req, res);
}).listen(PORT, () => console.log(`poopuri dev server → http://localhost:${PORT}`));
