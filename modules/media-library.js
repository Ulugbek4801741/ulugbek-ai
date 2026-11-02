"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const OPENVERSE_API = "https://api.openverse.org/v1/images/";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const LICENSES = new Set(["cc0", "by", "by-sa", "pdm"]);
const DOWNLOAD_HOSTS = new Set([
  "upload.wikimedia.org",
  "images.unsplash.com",
  "live.staticflickr.com",
  "images.pexels.com",
  "cdn.pixabay.com"
]);
const IMAGE_LIMIT = 12 * 1024 * 1024;
const VIDEO_LIMIT = 25 * 1024 * 1024;

function cleanText(value, max = 500) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
}
function licenseAllowed(value) {
  const normalized = cleanText(value, 80).toLowerCase().replace(/[^a-z0-9-]/g, "");
  return LICENSES.has(normalized);
}
function safeMediaUrl(value) {
  let url;
  try { url = new URL(value); } catch (_) { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return null;
  if (!DOWNLOAD_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url;
}
function identifyMedia(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return { mimeType: "image/png", extension: ".png", kind: "image" };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mimeType: "image/jpeg", extension: ".jpg", kind: "image" };
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return { mimeType: "image/webp", extension: ".webp", kind: "image" };
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") return { mimeType: "video/mp4", extension: ".mp4", kind: "video" };
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "OggS") return { mimeType: "video/ogg", extension: ".ogv", kind: "video" };
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "\u001aEß£") return { mimeType: "video/webm", extension: ".webm", kind: "video" };
  return null;
}
function normalizeOpenverse(item) {
  const license = cleanText(item.license, 80).toLowerCase();
  if (!licenseAllowed(license)) return null;
  const mediaUrl = safeMediaUrl(item.url);
  if (!mediaUrl) return null;
  return {
    id: "ov-" + cleanText(item.id, 100),
    provider: "openverse",
    title: cleanText(item.title, 240) || "Nomsiz media",
    creator: cleanText(item.creator, 200),
    license,
    licenseVersion: cleanText(item.license_version, 30),
    sourceUrl: cleanText(item.foreign_landing_url, 1000),
    mediaUrl: mediaUrl.toString(),
    kind: "image"
  };
}
function normalizeCommons(page) {
  const info = page?.imageinfo?.[0];
  const metadata = info?.extmetadata || {};
  const license = cleanText(metadata.LicenseShortName?.value || metadata.UsageTerms?.value, 100);
  if (!licenseAllowed(license)) return null;
  const mediaUrl = safeMediaUrl(info.url);
  if (!mediaUrl) return null;
  const type = identifyExtension(mediaUrl.pathname);
  if (!type) return null;
  return {
    id: "commons-" + String(page.pageid),
    provider: "wikimedia-commons",
    title: cleanText(page.title?.replace(/^File:/, ""), 240) || "Nomsiz media",
    creator: cleanText(metadata.Artist?.value?.replace(/<[^>]*>/g, " "), 200),
    license: license.toLowerCase(),
    licenseVersion: "",
    sourceUrl: "https://commons.wikimedia.org/wiki/" + encodeURIComponent(page.title || ""),
    mediaUrl: mediaUrl.toString(),
    kind: type
  };
}
function identifyExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return "image";
  if ([".mp4", ".webm", ".ogv", ".ogg"].includes(ext)) return "video";
  return null;
}
function commonsLicenseName(value) {
  const v = String(value || "").toLowerCase();
  if (/public domain|cc0/.test(v)) return "pdm";
  if (/cc by-sa/.test(v)) return "by-sa";
  if (/cc by/.test(v)) return "by";
  return v;
}
function safeCommons(page) {
  const normalized = normalizeCommons(page);
  if (normalized) return normalized;
  const info = page?.imageinfo?.[0];
  const rawLicense = info?.extmetadata?.LicenseShortName?.value || info?.extmetadata?.UsageTerms?.value || "";
  const license = commonsLicenseName(rawLicense);
  if (!licenseAllowed(license)) return null;
  const mediaUrl = safeMediaUrl(info?.url);
  const kind = mediaUrl && identifyExtension(mediaUrl.pathname);
  if (!mediaUrl || !kind) return null;
  return {
    id: "commons-" + String(page.pageid),
    provider: "wikimedia-commons",
    title: cleanText(page.title?.replace(/^File:/, ""), 240) || "Nomsiz media",
    creator: cleanText(info?.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, " "), 200),
    license,
    licenseVersion: "",
    sourceUrl: "https://commons.wikimedia.org/wiki/" + encodeURIComponent(page.title || ""),
    mediaUrl: mediaUrl.toString(),
    kind
  };
}
function createMediaLibrary({ env = process.env, fetchImpl = globalThis.fetch, dataDir } = {}) {
  const root = path.resolve(dataDir || path.join(env.ULUGBEK_DATA_DIR || path.join(process.cwd(), "data"), "media-library"));
  const assetsDir = path.join(root, "assets");
  const indexPath = path.join(root, "index.json");

  async function readIndex() {
    try {
      const parsed = JSON.parse(await fs.readFile(indexPath, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }
  async function writeIndex(items) {
    await fs.mkdir(root, { recursive: true });
    const temp = indexPath + "." + crypto.randomUUID() + ".tmp";
    await fs.writeFile(temp, JSON.stringify(items, null, 2), { mode: 0o600 });
    await fs.rename(temp, indexPath);
  }
  async function search(query, { limit = 12, kind = "all" } = {}) {
    const q = cleanText(query, 120);
    if (q.length < 2) { const error = new Error("Qidiruv kamida 2 ta belgidan iborat bo‘lsin."); error.status = 400; throw error; }
    const count = Math.max(1, Math.min(20, Number(limit) || 12));
    const results = [];
    const errors = [];
    if (kind !== "video") {
      try {
        const url = new URL(OPENVERSE_API);
        url.searchParams.set("q", q);
        url.searchParams.set("page_size", String(count));
        url.searchParams.set("license", "cc0,by,by-sa,pdm");
        const response = await fetchImpl(url, { headers: { Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error("Openverse HTTP " + response.status);
        const data = await response.json();
        for (const item of (Array.isArray(data.results) ? data.results : [])) {
          const normalized = normalizeOpenverse(item);
          if (normalized) results.push(normalized);
        }
      } catch (error) { errors.push("Openverse: " + cleanText(error.message, 120)); }
    }
    if (kind !== "image") {
      try {
        const url = new URL(COMMONS_API);
        url.searchParams.set("action", "query");
        url.searchParams.set("generator", "search");
        url.searchParams.set("gsrnamespace", "6");
        url.searchParams.set("gsrlimit", String(count));
        url.searchParams.set("gsrsearch", (kind === "video" ? "filetype:video " : "filetype:bitmap ") + q);
        url.searchParams.set("prop", "imageinfo");
        url.searchParams.set("iiprop", "url|extmetadata");
        url.searchParams.set("format", "json");
        const response = await fetchImpl(url, { headers: { Accept: "application/json", "User-Agent": "ULUGBEK-AI/1.0 (open licensed media library)" }, redirect: "error", signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error("Wikimedia Commons HTTP " + response.status);
        const data = await response.json();
        for (const page of Object.values(data.query?.pages || {})) {
          const normalized = safeCommons(page);
          if (normalized && (kind === "all" || normalized.kind === kind)) results.push(normalized);
        }
      } catch (error) { errors.push("Wikimedia Commons: " + cleanText(error.message, 120)); }
    }
    const unique = [...new Map(results.map(item => [item.id, item])).values()].slice(0, count * 2);
    return { query: q, results: unique, errors, licensePolicy: "CC0, CC BY, CC BY-SA and public domain only" };
  }
  async function importAsset(input) {
    const id = cleanText(input?.id, 120);
    const source = await readIndex();
    if (source.some(item => item.sourceId === id)) return { item: source.find(item => item.sourceId === id), duplicate: true };
    const license = cleanText(input?.license, 80).toLowerCase();
    if (!id || !licenseAllowed(license)) { const error = new Error("Faqat CC0, CC BY, CC BY-SA yoki public domain litsenziyali materiallar olinadi."); error.status = 400; throw error; }
    const mediaUrl = safeMediaUrl(input?.mediaUrl);
    if (!mediaUrl) { const error = new Error("Manba domeni ruxsat etilgan xavfsiz HTTPS manzil emas."); error.status = 400; throw error; }
    const response = await fetchImpl(mediaUrl, { redirect: "error", signal: AbortSignal.timeout(20000), headers: { Accept: "image/*,video/*" } });
    if (!response.ok) { const error = new Error("Media manbasi HTTP " + response.status + " javob qaytardi."); error.status = 502; throw error; }
    const declaredLength = Number(response.headers?.get?.("content-length") || 0);
    if (declaredLength > VIDEO_LIMIT) { const error = new Error("Fayl hajmi 25 MB dan oshmasligi kerak."); error.status = 413; throw error; }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > VIDEO_LIMIT) { const error = new Error("Media fayl bo‘sh yoki 25 MB dan katta."); error.status = 413; throw error; }
    const detected = identifyMedia(bytes);
    if (!detected || (detected.kind === "image" && bytes.length > IMAGE_LIMIT)) { const error = new Error("Fayl turi qo‘llab-quvvatlanmaydi yoki rasm 12 MB dan katta."); error.status = 415; throw error; }
    if (input.kind && input.kind !== detected.kind) { const error = new Error("Fayl turi manba ma’lumotiga mos kelmadi."); error.status = 415; throw error; }
    await fs.mkdir(assetsDir, { recursive: true });
    const fileName = crypto.randomUUID() + detected.extension;
    const fullPath = path.join(assetsDir, fileName);
    await fs.writeFile(fullPath, bytes, { flag: "wx", mode: 0o600 });
    const item = {
      id: crypto.randomUUID(),
      sourceId: id,
      provider: cleanText(input.provider, 40),
      title: cleanText(input.title, 240),
      creator: cleanText(input.creator, 200),
      license,
      licenseVersion: cleanText(input.licenseVersion, 30),
      sourceUrl: cleanText(input.sourceUrl, 1000),
      mediaUrl: mediaUrl.toString(),
      kind: detected.kind,
      mimeType: detected.mimeType,
      fileName,
      sizeBytes: bytes.length,
      importedAt: new Date().toISOString(),
      trainingStatus: "not-approved"
    };
    try {
      const latest = await readIndex();
      if (latest.some(existing => existing.sourceId === id)) {
        await fs.unlink(fullPath).catch(() => {});
        return { item: latest.find(existing => existing.sourceId === id), duplicate: true };
      }
      latest.push(item);
      await writeIndex(latest);
    } catch (error) {
      await fs.unlink(fullPath).catch(() => {});
      throw error;
    }
    return { item, duplicate: false };
  }
  async function list({ kind, limit = 50 } = {}) {
    const items = await readIndex();
    const filtered = kind && ["image", "video"].includes(kind) ? items.filter(item => item.kind === kind) : items;
    return filtered.slice(-Math.max(1, Math.min(100, Number(limit) || 50))).reverse();
  }
  async function status() {
    const items = await readIndex();
    return {
      ready: true,
      count: items.length,
      images: items.filter(item => item.kind === "image").length,
      videos: items.filter(item => item.kind === "video").length,
      trainingApproved: items.filter(item => item.trainingStatus === "approved").length,
      storage: "server-local",
      automaticTraining: false,
      note: "Saqlash modelni avtomatik o‘qitmaydi. Har bir material litsenziya va sifat tekshiruvidan keyin alohida tasdiqlanishi kerak."
    };
  }
  return { search, importAsset, list, status };
}

module.exports = {
  createMediaLibrary,
  licenseAllowed,
  safeMediaUrl,
  identifyMedia,
  normalizeOpenverse,
  safeCommons
};
