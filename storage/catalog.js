/**
 * ULUGBEK AI storage provider catalogue.
 * "s3-adapter" means the generic S3-compatible adapter can be used after
 * endpoint/region/credentials are configured and verified with a real bucket.
 * This catalogue does not imply an account exists or any capacity is provisioned.
 */
"use strict";

const STORAGE_CATALOG = Object.freeze([
  { id: "cloudflare-r2", type: "object", adapter: "s3-compatible", envPrefix: "R2", status: "adapter-available", pricing: "free-and-paid", notes: "10 GB-month free tier published; verify current terms." },
  { id: "amazon-s3", type: "object", adapter: "s3-compatible", envPrefix: "S3", status: "adapter-available", pricing: "paid-with-limited-free-tier", notes: "AWS region and endpoint pricing varies." },
  { id: "backblaze-b2", type: "object", adapter: "s3-compatible", envPrefix: "B2", status: "adapter-available", pricing: "free-and-paid", notes: "S3-compatible API; account and bucket required." },
  { id: "wasabi", type: "object", adapter: "s3-compatible", envPrefix: "WASABI", status: "adapter-available", pricing: "paid", notes: "Minimum storage and retention rules may apply." },
  { id: "digitalocean-spaces", type: "object", adapter: "s3-compatible", envPrefix: "SPACES", status: "adapter-available", pricing: "paid", notes: "Subscription pricing; region-specific endpoint." },
  { id: "minio", type: "object", adapter: "s3-compatible", envPrefix: "MINIO", status: "adapter-available", pricing: "self-hosted", notes: "Capacity depends on your own server/disks." },
  { id: "tigris", type: "object", adapter: "s3-compatible", envPrefix: "TIGRIS", status: "adapter-available", pricing: "free-and-paid", notes: "Check current plan and usage limits." },
  { id: "hetzner-object-storage", type: "object", adapter: "s3-compatible", envPrefix: "HETZNER", status: "adapter-available", pricing: "paid", notes: "Regional availability and plan minimums apply." },
  { id: "vultr-object-storage", type: "object", adapter: "s3-compatible", envPrefix: "VULTR", status: "adapter-available", pricing: "paid", notes: "Region-specific endpoint." },
  { id: "akamai-object-storage", type: "object", adapter: "s3-compatible", envPrefix: "AKAMAI", status: "adapter-available", pricing: "paid", notes: "Endpoint and API compatibility must be verified." },
  { id: "scaleway-object-storage", type: "object", adapter: "s3-compatible", envPrefix: "SCALEWAY", status: "adapter-available", pricing: "free-and-paid", notes: "Region-specific endpoint and current terms must be checked." },
  { id: "storj", type: "object", adapter: "s3-compatible", envPrefix: "STORJ", status: "adapter-available", pricing: "free-and-paid", notes: "S3 gateway configuration may differ by account." },
  { id: "idrive-e2", type: "object", adapter: "s3-compatible", envPrefix: "IDRIVE_E2", status: "adapter-available", pricing: "free-and-paid", notes: "Check current free quota and endpoint." },
  { id: "oracle-object-storage-s3", type: "object", adapter: "s3-compatible", envPrefix: "ORACLE_S3", status: "adapter-available", pricing: "free-and-paid", notes: "S3 compatibility/configuration varies by tenancy and region." },
  { id: "google-cloud-storage", type: "object", adapter: null, status: "adapter-needed", pricing: "free-and-paid", notes: "Requires a dedicated Google Cloud Storage adapter or validated interoperability configuration." },
  { id: "azure-blob-storage", type: "object", adapter: null, status: "adapter-needed", pricing: "free-and-paid", notes: "Requires Azure Blob SDK adapter; not supported by the S3 adapter." },
  { id: "firebase-storage", type: "object", adapter: null, status: "adapter-needed", pricing: "free-and-paid", notes: "Separate Firebase SDK, project, rules and billing setup required." },
  { id: "supabase-storage", type: "object", adapter: null, status: "adapter-needed", pricing: "free-and-paid", notes: "Separate Supabase SDK/API, project and policy setup required." },
  { id: "cloudinary", type: "media", adapter: null, status: "adapter-needed", pricing: "free-and-paid", notes: "Media transformation platform, not a generic unlimited drive." },
  { id: "google-drive", type: "user-drive", adapter: null, status: "oauth-integration-needed", pricing: "free-and-paid", notes: "User-owned drive requires OAuth consent and per-user authorization." },
  { id: "microsoft-onedrive", type: "user-drive", adapter: null, status: "oauth-integration-needed", pricing: "free-and-paid", notes: "User-owned drive requires Microsoft Graph OAuth and permissions." },
  { id: "dropbox", type: "user-drive", adapter: null, status: "oauth-integration-needed", pricing: "free-and-paid", notes: "User-owned drive requires OAuth and permission scopes." },
]);

function listStorageProviders() {
  return STORAGE_CATALOG.map((provider) => ({ ...provider }));
}

module.exports = { STORAGE_CATALOG, listStorageProviders };
