"use strict";

const { createStorageProvider } = require("./providers");

function getConfiguredProviders(env = process.env) {
  const candidates = [
    { name: "cloudflare-r2", prefix: "R2", regionDefault: "auto" },
    { name: "amazon-s3", prefix: "S3" },
    { name: "backblaze-b2", prefix: "B2" },
    { name: "wasabi", prefix: "WASABI" },
    { name: "digitalocean-spaces", prefix: "SPACES" },
    { name: "minio", prefix: "MINIO", regionDefault: "us-east-1", forcePathStyle: true },
    { name: "tigris", prefix: "TIGRIS", regionDefault: "auto" },
    { name: "hetzner-object-storage", prefix: "HETZNER" },
    { name: "vultr-object-storage", prefix: "VULTR" },
    { name: "akamai-object-storage", prefix: "AKAMAI" },
    { name: "scaleway-object-storage", prefix: "SCALEWAY" },
    { name: "storj", prefix: "STORJ" },
    { name: "idrive-e2", prefix: "IDRIVE_E2" },
    { name: "oracle-object-storage-s3", prefix: "ORACLE_S3" },
  ];

  const providers = [];
  for (const item of candidates) {
    const read = (suffix) => env[item.prefix + "_" + suffix];
    const endpoint = read("ENDPOINT");
    const bucket = read("BUCKET");
    const accessKeyId = read("ACCESS_KEY_ID");
    const secretAccessKey = read("SECRET_ACCESS_KEY");
    const region = read("REGION") || item.regionDefault;
    if ([endpoint, bucket, accessKeyId, secretAccessKey, region].every(Boolean)) {
      providers.push(createStorageProvider({
        name: item.name,
        endpoint,
        bucket,
        accessKeyId,
        secretAccessKey,
        region,
        forcePathStyle: Boolean(item.forcePathStyle),
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
