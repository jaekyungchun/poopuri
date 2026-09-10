/* ============================================================
   poopuri — shared Cloudflare R2 (S3-compatible) helpers
   Reads config from env vars set in the Vercel project:
     R2_ACCOUNT_ID        your Cloudflare account id
     R2_ACCESS_KEY_ID     R2 API token access key
     R2_SECRET_ACCESS_KEY R2 API token secret
     R2_BUCKET            the bucket name (e.g. "poopuri")
     R2_PUBLIC_BASE       the bucket's public URL (r2.dev or a custom domain)
   ============================================================ */
import { S3Client } from "@aws-sdk/client-s3";

export const BUCKET = process.env.R2_BUCKET;
export const PREFIX = "poopuri/";
export const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || "").replace(/\/+$/, "");

export const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  // Newer AWS SDKs add CRC checksum headers that R2 rejects on presigned
  // PUTs — only compute them when a command actually requires it.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

// Deterministic audio content-type from the file extension, so songs are
// served with a type browsers will actually play (not octet-stream).
const CT = {
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac",
  ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg",
  webm: "audio/webm", wav: "audio/wav", flac: "audio/flac",
};
export function contentTypeFor(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  return CT[ext] || "application/octet-stream";
}

// Public URL for an object key, path-segment-encoded.
export function publicUrl(key) {
  return PUBLIC_BASE + "/" + key.split("/").map(encodeURIComponent).join("/");
}

export function missingEnv() {
  const need = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE"];
  return need.filter((k) => !process.env[k]);
}
