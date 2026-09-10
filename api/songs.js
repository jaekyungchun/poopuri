/* ============================================================
   poopuri — song library endpoint (Cloudflare R2)
   GET     -> list every song in the shared library
   DELETE  -> remove one song (?key=<object key>  or  ?url=<public url>)
   Songs live under the "poopuri/" prefix in your R2 bucket and are
   served from its public base URL.
   ============================================================ */
import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET, PREFIX, PUBLIC_BASE, publicUrl, missingEnv } from "./_r2.js";

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;

function pretty(name) {
  const stem = name.replace(AUDIO_EXT, "");
  const cleaned = stem.replace(/^\s*\d{1,3}\s*[-.)]?\s+/, "").trim();
  const dash = cleaned.split(/\s+-\s+/);
  if (dash.length >= 2) return { artist: dash[0].trim(), title: dash.slice(1).join(" - ").trim() || stem };
  return { artist: "", title: cleaned || stem };
}

export default async function handler(req, res) {
  const miss = missingEnv();
  if (miss.length) { res.status(500).json({ error: "storage not configured: missing " + miss.join(", ") }); return; }
  try {
    if (req.method === "GET") {
      const songs = [];
      let token;
      do {
        const out = await s3.send(new ListObjectsV2Command({
          Bucket: BUCKET, Prefix: PREFIX, MaxKeys: 1000, ContinuationToken: token,
        }));
        (out.Contents || []).forEach((o) => {
          if (o.Key.endsWith("/")) return;
          const name = o.Key.slice(PREFIX.length);
          const p = pretty(name);
          songs.push({
            url: publicUrl(o.Key), key: o.Key, name,
            title: p.title, artist: p.artist,
            size: o.Size, uploadedAt: o.LastModified,
          });
        });
        token = out.IsTruncated ? out.NextContinuationToken : undefined;
      } while (token);
      songs.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ songs });
      return;
    }

    if (req.method === "DELETE") {
      let key = req.query?.key;
      if (!key) {
        const url = req.query?.url || (req.body && (typeof req.body === "string" ? JSON.parse(req.body).url : req.body.url));
        if (url && PUBLIC_BASE && url.startsWith(PUBLIC_BASE)) {
          key = decodeURIComponent(url.slice(PUBLIC_BASE.length).replace(/^\/+/, ""));
        }
      } else {
        key = decodeURIComponent(key);
      }
      if (!key) { res.status(400).json({ error: "key or url required" }); return; }
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "GET or DELETE" });
  } catch (err) {
    res.status(500).json({ error: err?.message || "server error" });
  }
}
