/* ============================================================
   poopuri — song library endpoint
   GET     -> list every song in the shared library
   DELETE  -> remove one song (?url=<blob url>)
   Songs live under the "poopuri/" prefix in your Vercel Blob store.
   ============================================================ */
import { list, del } from "@vercel/blob";

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;

function pretty(name) {
  const stem = name.replace(AUDIO_EXT, "");
  const cleaned = stem.replace(/^\s*\d{1,3}\s*[-.)]?\s+/, "").trim();
  const dash = cleaned.split(/\s+-\s+/);
  if (dash.length >= 2) {
    return { artist: dash[0].trim(), title: dash.slice(1).join(" - ").trim() || stem };
  }
  return { artist: "", title: cleaned || stem };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { blobs } = await list({ prefix: "poopuri/", limit: 1000 });
      const songs = blobs
        .filter((b) => !b.pathname.endsWith("/"))
        .map((b) => {
          const name = decodeURIComponent(b.pathname.replace(/^poopuri\//, ""));
          const p = pretty(name);
          return { url: b.url, name, title: p.title, artist: p.artist, size: b.size, uploadedAt: b.uploadedAt };
        })
        .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ songs });
      return;
    }
    if (req.method === "DELETE") {
      const url = req.query?.url || (req.body && (typeof req.body === "string" ? JSON.parse(req.body).url : req.body.url));
      if (!url) { res.status(400).json({ error: "url required" }); return; }
      await del(url);
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: "GET or DELETE" });
  } catch (err) {
    res.status(500).json({ error: err?.message || "server error" });
  }
}
