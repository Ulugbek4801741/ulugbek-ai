"use strict";

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const REQUIRED = ["endpoint", "region", "bucket", "accessKeyId", "secretAccessKey"];

function createStorageProvider(config) {
  for (const field of REQUIRED) {
    if (!config || !config[field]) {
      throw new Error("Storage sozlamasi yetishmaydi: " + field);
    }
  }

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.forcePathStyle),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const bucket = config.bucket;
  const prefix = String(config.prefix || "").replace(/^\/+|\/+$/g, "");
  const objectKey = (key) => {
    if (typeof key !== "string" || !key.trim() || key.length > 900) {
      throw new TypeError("Fayl kaliti noto‘g‘ri");
    }
    if (key.startsWith("/") || key.split("/").some((part) => part === "..")) {
      throw new TypeError("Fayl kaliti ruxsat etilmagan yo‘lni o‘z ichiga oladi");
    }
    return prefix ? prefix + "/" + key : key;
  };

  return Object.freeze({
    name: config.name || "s3-compatible",

    async createUploadUrl(key, contentType, expiresIn = 300) {
      const safeKey = objectKey(key);
      if (!Number.isInteger(expiresIn) || expiresIn < 30 || expiresIn > 900) {
        throw new RangeError("Havola muddati 30–900 soniya oralig‘ida bo‘lishi kerak");
      }
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: safeKey,
        ContentType: typeof contentType === "string" ? contentType.slice(0, 200) : "application/octet-stream",
        ...(config.serverSideEncryption ? { ServerSideEncryption: config.serverSideEncryption } : {}),
      });
      return getSignedUrl(client, command, { expiresIn });
    },

    async createDownloadUrl(key, expiresIn = 300) {
      if (!Number.isInteger(expiresIn) || expiresIn < 30 || expiresIn > 900) {
        throw new RangeError("Havola muddati 30–900 soniya oralig‘ida bo‘lishi kerak");
      }
      return getSignedUrl(client, new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey(key),
      }), { expiresIn });
    },

    async getMetadata(key) {
      const result = await client.send(new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey(key),
      }));
      return {
        contentLength: result.ContentLength ?? null,
        contentType: result.ContentType ?? null,
        lastModified: result.LastModified ?? null,
        etag: result.ETag ?? null,
      };
    },

    async deleteObject(key) {
      await client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey(key),
      }));
      return { success: true };
    },
  });
}

module.exports = { createStorageProvider };
