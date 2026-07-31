/* ============================================================
   poopuri — upload token endpoint
   The browser uploads audio files DIRECTLY to Vercel Blob (so big
   songs aren't capped by the serverless body limit). This function
   just hands the browser a short-lived, scoped upload token.
   Requires a Blob store linked to the project, which sets the
   BLOB_READ_WRITE_TOKEN env var automatically.
   ============================================================ */
import { handleUpload } from "@vercel/blob/client";

const ALLOWED = [
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/aac", "audio/x-m4a",
  "audio/ogg", "audio/opus", "audio/wav", "audio/x-wav", "audio/flac",
  "audio/x-flac", "audio/webm", "application/octet-stream",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED,
        addRandomSuffix: false,          // keep the real filename (title/artist live in it)
        maximumSizeInBytes: 60 * 1024 * 1024, // 60 MB per song is plenty
      }),
      // Fires after the upload finishes (only on a public URL, not localhost).
      // We refresh the list from the client instead, so nothing to do here.
      onUploadCompleted: async () => {},
    });
    res.status(200).json(json);
  } catch (err) {
    res.status(400).json({ error: err?.message || "upload failed" });
  }
}
