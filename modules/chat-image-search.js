"use strict";

// Lightweight, key-free image discovery from Wikimedia Commons.
// Returns only public image URLs with source and license attribution.
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 40;
const cache = new Map();

function clean(value, max = 180) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function buildImageQuery(query) {
  let q = clean(query, 400)
    .replace(/\\b(haqida|ma'lumot|malumot|ber|aytib ber|tushuntir|yozib ber|qanday|nima)\\b/giu, " ")
    .replace(/[?!.,:;]+/g, " ").replace(/\\s+/g, " ").trim();
  const place = q.match(/\\b(kogon|buxoro|samarqand|toshkent|xiva|urganch|andijon|namangan|farg'ona)\\b/iu);
  if (place && !/uzbekistan/i.test(q)) q += " Uzbekistan";
  return q.slice(0, 180);
}
function imageIntent(query) {
  const q = clean(query, 400);
  if (q.length < 8) return false;
  if (/^(salom|assalomu alaykum|rahmat|xayr|ha|yo‘q|yo'q)\b/i.test(q)) return false;
  if (/\b(kod|dastur|debug|xatoni tuzat|translate|tarjima|hisobla)\b/i.test(q)) return false;
  return true;
}
async function searchImages(query, limit = 4) {
  const original = clean(query, 400);
  if (!imageIntent(original)) return [];
  const q = buildImageQuery(original);
  if (!q) return [];
  const key = q.toLocaleLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.items;
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: "filetype:bitmap " + q,
    gsrnamespace: "6", gsrlimit: String(Math.max(1, Math.min(4, limit))),
    prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "640",
    format: "json", formatversion: "2", origin: "*"
  }).toString();
  const response = await fetch(url, {
    headers: { "User-Agent": "ULUGBEK-AI/1.0 (public image discovery; contact: project maintainer)" },
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error("Wikimedia Commons HTTP " + response.status);
  const data = await response.json();
  const pages = Array.isArray(data?.query?.pages) ? data.query.pages : [];
  const items = pages.map(page => {
    const info = page.imageinfo?.[0] || {};
    const thumbnail = String(info.thumburl || "");
    const source = String(info.descriptionurl || "");
    if (!thumbnail.startsWith("https://upload.wikimedia.org/") ||
        !source.startsWith("https://commons.wikimedia.org/")) return null;
    const meta = info.extmetadata || {};
    const value = item => clean(String(item?.value || "").replace(/<[^>]*>/g, " "), 180);
    return {
      title: clean(String(page.title || "").replace(/^File:/, "").replace(/_/g, " "), 160),
      thumbnail, source,
      license: value(meta.LicenseShortName) || "Litsenziya sahifasida ko‘rsatilgan",
      artist: value(meta.Artist)
    };
  }).filter(Boolean).slice(0, 4);
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL, items });
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return items;
}
module.exports = { clean, imageIntent, buildImageQuery, searchImages };
