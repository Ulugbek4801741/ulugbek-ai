"use strict";

const express = require("express");
const helmet = require("helmet");
const crypto = require("node:crypto");
const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
const PORT = Number(process.env.PORT || 10000);
const BUCKET = String(process.env.VAULT_BUCKET || "ulugbek-ai-files");
const TOKEN = String(process.env.VAULT_TOKEN || "");
const MAX_ARCHIVE = 25 * 1024 * 1024;
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});
let lastArchive = null;
let lastError = null;

function authorize(req, res, next) {
  const value = String(req.headers.authorization || "");
  const expected = Buffer.from("Bearer " + TOKEN);
  const actual = Buffer.from(value);
  if (!TOKEN || expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return res.status(401).json({ ok: false, error: "Internal vault authorization required." });
  }
  next();
}
function safeName(value) {
  return String(value || "knowledge.zip").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

app.get("/health", async (_req, res) => {
  const configured = Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY && process.env.VAULT_TOKEN);
  res.status(configured ? 200 : 503).json({
    ok: configured, service: "ulugbek-knowledge-vault", storage: "neon-private-s3",
    bucket: BUCKET, lastArchive, lastError
  });
});

app.put("/api/vault/archive", authorize, express.raw({
  type: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
  limit: MAX_ARCHIVE
}), async (req, res) => {
  try {
    const bytes = req.body;
    if (!Buffer.isBuffer(bytes) || bytes.length < 22 || bytes.length > MAX_ARCHIVE ||
        bytes.readUInt32LE(0) !== 0x04034b50) {
      return res.status(400).json({ ok: false, error: "Invalid or oversized ZIP archive." });
    }
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const createdAt = new Date().toISOString();
    const key = "public-knowledge/" + createdAt.replace(/[:.]/g, "-") + "-" + sha256.slice(0, 16) + ".zip";
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: bytes, ContentType: "application/zip",
      Metadata: { sha256, source: "ulugbek-ai-public-learning" },
      ServerSideEncryption: "AES256"
    }));
    const manifest = {
      schema: "ulugbek-knowledge-vault-v1", createdAt, key, sha256,
      bytes: bytes.length, format: "zip", scope: "public-open-license-only",
      usage: "retrieval-only; never execute archived files"
    };
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: "public-knowledge/latest.json",
      Body: Buffer.from(JSON.stringify(manifest, null, 2)),
      ContentType: "application/json", ServerSideEncryption: "AES256"
    }));
    lastArchive = manifest;
    lastError = null;
    res.status(201).json({ ok: true, archive: manifest });
  } catch (error) {
    lastError = String(error.name || "StorageError").slice(0, 100);
    res.status(503).json({ ok: false, error: "Archive storage failed.", type: lastError });
  }
});

app.get("/api/vault/latest", authorize, async (_req, res) => {
  try {
    const latest = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: "public-knowledge/latest.json" }));
    const manifest = JSON.parse(await latest.Body.transformToString());
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: manifest.key }));
    if (Number(head.ContentLength) !== Number(manifest.bytes) ||
        head.Metadata?.sha256 !== manifest.sha256) throw new Error("Archive metadata mismatch");
    const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: manifest.key }));
    const bytes = Buffer.from(await object.Body.transformToByteArray());
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== manifest.sha256) {
      throw new Error("Archive integrity check failed");
    }
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="ulugbek-public-knowledge.zip"');
    res.setHeader("X-Archive-SHA256", manifest.sha256);
    res.send(bytes);
  } catch (error) {
    res.status(404).json({ ok: false, error: "No verified archive is available yet." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("ULUGBEK Knowledge Vault listening on " + PORT);
});
