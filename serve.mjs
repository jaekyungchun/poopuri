/* Local dev server for poopuri.
   In production, Vercel serves the static files and runs /api/* against
   Cloudflare R2. This little server MOCKS that R2 flow against a local
   ".devsongs/" folder so the whole app (upload, list, play, delete,
   offline cache) works locally with no cloud:
     • POST /api/upload  -> a local presigned-style PUT url
     • PUT  /devupload   -> saves the bytes into .devsongs/
     • GET  /api/songs   -> lists .devsongs/ as the library
     • DELETE /api/songs -> removes one
     • GET  /devsongs/*  -> serves the audio (with range support)
   Run:  node serve.mjs
*/
import { createServer } from "node:http";
import { createReadStream, createWriteStream, statSync, readdirSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
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

  const ctFor = (name) => TYPES[extname(name).toLowerCase()] || "application/octet-stream";
  const keyToName = (key) => basename(decodeURIComponent(key).replace(/^poopuri\//, ""));

  // --- mock API: song library ---
  if (path === "/api/songs") {
    if (req.method === "GET") {
      const songs = readdirSync(DEV_SONGS).filter((f) => AUDIO_EXT.test(f)).map((f) => {
        const p = pretty(f);
        return { url: "/devsongs/" + encodeURIComponent(f), key: "poopuri/" + f, name: f,
          title: p.title, artist: p.artist,
          size: statSync(resolve(DEV_SONGS, f)).size, uploadedAt: statSync(resolve(DEV_SONGS, f)).mtime.toISOString() };
      });
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ songs }));
      return;
    }
    if (req.method === "DELETE") {
      const name = keyToName(u.searchParams.get("key") || basename(u.searchParams.get("url") || ""));
      try { unlinkSync(resolve(DEV_SONGS, name)); res.writeHead(200).end('{"ok":true}'); }
      catch { res.writeHead(404).end('{"error":"not found"}'); }
      return;
    }
    res.writeHead(405).end('{"error":"GET or DELETE"}');
    return;
  }

  // --- mock API: hand back a local "presigned" PUT url ---
  if (path === "/api/upload" && req.method === "POST") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      let name = "song";
      try { name = String(JSON.parse(raw).name || "song").replace(/[\\/]+/g, "_"); } catch {}
      const key = "poopuri/" + name;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        uploadUrl: "/devupload?key=" + encodeURIComponent(key),
        url: "/devsongs/" + encodeURIComponent(name), key, contentType: ctFor(name),
      }));
    });
    return;
  }

  // --- mock storage: accept the PUT and write it into .devsongs/ ---
  if (path === "/devupload" && req.method === "PUT") {
    const name = keyToName(u.searchParams.get("key") || "");
    const dest = normalize(resolve(DEV_SONGS, name));
    if (!name || !dest.startsWith(DEV_SONGS)) { res.writeHead(400).end(); return; }
    const ws = createWriteStream(dest);
    req.pipe(ws);
    ws.on("finish", () => res.writeHead(200).end());
    ws.on("error", () => res.writeHead(500).end());
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
