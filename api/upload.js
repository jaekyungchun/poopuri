/* ============================================================
   poopuri — upload endpoint (Cloudflare R2)
   The browser asks for a short-lived presigned PUT URL and uploads
   the file DIRECTLY to R2 (so big songs aren't capped by the
   serverless body limit). We never see the bytes here.
   ============================================================ */
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET, PREFIX, contentTypeFor, publicUrl, missingEnv } from "./_r2.js";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  const miss = missingEnv();
  if (miss.length) { res.status(500).json({ error: "storage not configured: missing " + miss.join(", ") }); return; }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const rawName = String(body.name || "").trim();
    if (!rawName) { res.status(400).json({ error: "name required" }); return; }

    // Keep the readable filename (title/artist live in it); only strip path
    // separators and control chars — spaces, hyphens, parens are fine as keys.
    const safeName = rawName.replace(/[\\/]+/g, "_").replace(/[\x00-\x1f]/g, "").trim();
    const key = PREFIX + safeName;
    const contentType = contentTypeFor(safeName);

    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 600 });

    res.status(200).json({ uploadUrl, url: publicUrl(key), key, contentType });
  } catch (err) {
    res.status(500).json({ error: err?.message || "upload failed" });
  }
}
