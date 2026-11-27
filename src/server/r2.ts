import { AwsClient } from "aws4fetch";
import type { BlobStore } from "@/lib/data/localRepository";

export interface R2Config { readonly accountId: string; readonly bucket: string; readonly accessKeyId: string; readonly secretAccessKey: string }

const PRESIGN_SECONDS = 15 * 60;

/**
 * Cloudflare R2 over its S3 API. Uploads and downloads use short-lived presigned URLs so file
 * bytes go browser <-> R2 directly and never hit Vercel's 4.5 MB function body limit.
 */
export function r2Client(cfg: R2Config) {
  const aws = new AwsClient({ accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, service: "s3", region: "auto" });
  const base = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}`;
  const objectUrl = (key: string) => `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;

  const presign = async (method: "GET" | "PUT", key: string, extra: Record<string, string> = {}, headers: Record<string, string> = {}): Promise<string> => {
    const url = new URL(objectUrl(key));
    url.searchParams.set("X-Amz-Expires", String(PRESIGN_SECONDS));
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
    const signed = await aws.sign(new Request(url, { method, headers }), { aws: { signQuery: true, allHeaders: true } });
    return signed.url;
  };

  const blobs: BlobStore = {
    async put(key, blob) {
      const res = await aws.fetch(objectUrl(key), { method: "PUT", body: await blob.arrayBuffer(), headers: { "Content-Type": blob.type || "application/octet-stream" } });
      if (!res.ok) throw new Error(`File upload failed (${res.status}).`);
    },
    async get(key) {
      const res = await aws.fetch(objectUrl(key));
      return res.ok ? res.blob() : null;
    },
  };

  return {
    blobs,
    /** The signature covers Content-Length, so R2 rejects any upload that isn't exactly the declared size. */
    uploadUrl: (key: string, size: number) => presign("PUT", key, {}, { "content-length": String(size) }),
    downloadUrl: (key: string, filename: string) =>
      presign("GET", key, { "response-content-disposition": `attachment; filename="${filename.replace(/[^\w.\- ]+/g, "_")}"` }),
    /** Lets browsers on the site PUT straight to presigned URLs. Idempotent. */
    async allowBrowserUploads(origins: readonly string[]): Promise<boolean> {
      const rules = origins.map((o) => `<CORSRule><AllowedOrigin>${o}</AllowedOrigin><AllowedMethod>PUT</AllowedMethod><AllowedMethod>GET</AllowedMethod><AllowedHeader>*</AllowedHeader><MaxAgeSeconds>3600</MaxAgeSeconds></CORSRule>`).join("");
      const res = await aws.fetch(`${base}?cors`, { method: "PUT", body: `<CORSConfiguration>${rules}</CORSConfiguration>`, headers: { "Content-Type": "application/xml" } });
      return res.ok;
    },
  };
}

/** R2 S3 credentials derive from a Cloudflare API token: key id = token id, secret = SHA-256(token value). */
export async function r2SecretFromToken(tokenValue: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tokenValue));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
