"use strict";

const { createStorageProvider } = require("./providers");

function getConfiguredProviders(env = process.env) {
  const providers = [];
  const candidates = [
    {
      name: "cloudflare-r2",
      endpoint: env.R2_ENDPOINT,
      region: env.R2_REGION || "auto",
      bucket: env.R2_BUCKET,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      forcePathStyle: false,
    },
    {
      name: "amazon-s3",
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      forcePathStyle: false,
    },
    {
      name: "backblaze-b2",
      endpoint: env.B2_ENDPOINT,
      region: env.B2_REGION,
      bucket: env.B2_BUCKET,
      accessKeyId: env.B2_ACCESS_KEY_ID,
      secretAccessKey: env.B2_SECRET_ACCESS_KEY,
      forcePathStyle: false,
    },
    {
      name: "wasabi",
      endpoint: env.WASABI_ENDPOINT,
      region: env.WASABI_REGION,
      bucket: env.WASABI_BUCKET,
      accessKeyId: env.WASABI_ACCESS_KEY_ID,
      secretAccessKey: env.WASABI_SECRET_ACCESS_KEY,
      forcePathStyle: false,
    },
    {
      name: "digitalocean-spaces",
      endpoint: env.SPACES_ENDPOINT,
      region: env.SPACES_REGION,
      bucket: env.SPACES_BUCKET,
      accessKeyId: env.SPACES_ACCESS_KEY_ID,
      secretAccessKey: env.SPACES_SECRET_ACCESS_KEY,
      forcePathStyle: false,
    },
    {
      name: "minio",
      endpoint: env.MINIO_ENDPOINT,
      region: env.MINIO_REGION || "us-east-1",
      bucket: env.MINIO_BUCKET,
      accessKeyId: env.MINIO_ACCESS_KEY_ID,
      secretAccessKey: env.MINIO_SECRET_ACCESS_KEY,
      forcePathStyle: true,
    },
  ];

  for (const item of candidates) {
    const fields = [item.endpoint, item.bucket, item.accessKeyId, item.secretAccessKey];
    if (fields.every(Boolean) && item.region) {
      providers.push(createStorageProvider({
        ...item,
        serverSideEncryption: env.STORAGE_SERVER_SIDE_ENCRYPTION || undefined,
      }));
    }
  }

  return providers;
}

function createStorageRegistry(env = process.env) {
  const providers = getConfiguredProviders(env);
  const byName = new Map(providers.map((provider) => [provider.name, provider]));

  return Object.freeze({
    list() {
      return providers.map((provider) => ({ name: provider.name, ready: true }));
    },
    get(name) {
      const provider = byName.get(name);
      if (!provider) throw new Error("Xotira provayderi sozlanmagan: " + String(name));
      return provider;
    },
  });
}

module.exports = { createStorageRegistry, getConfiguredProviders };
