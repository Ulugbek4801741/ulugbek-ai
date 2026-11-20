"use strict";

// Openverse is the primary openly licensed image search; Wikimedia Commons is
// a fallback. Never invent image URLs or drop creator/license attribution.
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 40;
const cache = new Map();

function clean(value, max = 180) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function normalizePlaceQuery(query) {
  let q = clean(query, 400)
    .replace(/\b(haqida|ma[’ʻ']?lumot|malumot|ber|aytib ber|tushuntir|yozib ber|qanday|nima|shahri|shahar|viloyati|viloyat)\b/giu, " ")
    .replace(/[?!.,:;]+/g, " ").replace(/\s+/g, " ").trim();
  const lower = q.toLocaleLowerCase("uz");
  if (/\bkogon\b|\bkagan\b/iu.test(lower)) {
    return { place: "Kogon", queries: [
      "Kogon Uzbekistan",
      "Kagan railway station Uzbekistan",
      "Bukhara-1 railway station Kogon Uzbekistan"
    ] };
  }
  if (/\bbuxoro\b|\bbukhara\b/iu.test(lower)) {
    return { place: "Bukhara", queries: [
      "Bukhara Uzbekistan historic city",
      "Bukhara old city architecture Uzbekistan",
      "Bukhara railway station Uzbekistan"
    ] };
  }
  if (!/uzbekistan/i.test(q)) q += " Uzbekistan";
  return { place: q, queries: [q, q + " historic landmarks", q + " railway station"] };
}
function buildImageQuery(query) {
  return normalizePlaceQuery(query).queries[0].slice(0, 180);
}
function imageIntent(query) {
  const q = clean(query, 400);
  if (q.length < 8) return false;
  if (/^(salom|assalomu alaykum|rahmat|xayr|ha|yo‘q|yo'q)\b/i.test(q)) return false;
  if (/\b(kod|dastur|debug|xatoni tuzat|translate|tarjima|hisobla)\b/i.test(q)) return false;
  return true;
}
function isSafeHttps(value) {
  try { return new URL(value).protocol === "https:"; } catch (_) { return false; }
}
function relevanceScore(item, place) {
  const text = (String(item.title || "") + " " +
    (Array.isArray(item.tags) ? item.tags.map(tag => typeof tag === "string" ? tag : tag?.name || "").join(" ") : "")).toLocaleLowerCase("uz");
  if (/kogon|kagan|каган|когон/.test(text)) return 5;
  if (/bukhara.?1|бухара.?1/.test(text)) return 4;
  if (place === "Bukhara" && /bukhara|buxoro/.test(text)) return 3;
  return 0;
}
async function searchOpenverse(queries, place, limit) {
  const batches = await Promise.all(queries.map(async q => {
    const endpoint = new URL("https://api.openverse.org/v1/images/");
    endpoint.search = new URLSearchParams({
      q, page_size: "12", license_type: "all-cc", mature: "false"
    }).toString();
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "ULUGBEK-AI/1.0 (openly licensed image discovery)" },
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) throw new Error("Openverse HTTP " + response.status);
    const data = await response.json();
    return Array.isArray(data?.results) ? data.results : [];
  }));
  const byUrl = new Map();
  for (const item of batches.flat()) {
    const thumbnail = String(item.thumbnail || "");
    const source = String(item.foreign_landing_url || "");
    const imageUrl = String(item.url || "");
    if (!isSafeHttps(thumbnail) || !isSafeHttps(source) || !isSafeHttps(imageUrl)) continue;
    const score = relevanceScore(item, place);
    if (score < (place === "Kogon" ? 4 : 2)) continue;
    const key = source;
    if (byUrl.has(key)) continue;
    byUrl.set(key, {
      title: clean(item.title || place + " rasmi", 160),
      thumbnail, imageUrl, source,
      license: clean([item.license, item.license_version].filter(Boolean).join(" "), 80) || "Litsenziya sahifasida",
      licenseUrl: isSafeHttps(item.license_url) ? item.license_url : "",
      artist: clean(item.creator || "", 160),
      attribution: clean(item.attribution || "", 400),
      provider: clean(item.provider || item.source || "Openverse", 80)
    });
  }
  return [...byUrl.values()].slice(0, limit);
}
async function searchCommons(queries, limit) {
  const batches = await Promise.all(queries.slice(0, 2).map(async q => {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query", generator: "search", gsrsearch: "filetype:bitmap " + q,
      gsrnamespace: "6", gsrlimit: String(Math.max(1, Math.min(4, limit))),
      prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "640",
      format: "json", formatversion: "2", origin: "*"
    }).toString();
    const response = await fetch(url, {
      headers: { "User-Agent": "ULUGBEK-AI/1.0 (public image discovery; openly licensed media)" },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error("Wikimedia Commons HTTP " + response.status);
    const data = await response.json();
    return Array.isArray(data?.query?.pages) ? data.query.pages : [];
  }));
  const items = [];
  for (const page of batches.flat()) {
    const info = page.imageinfo?.[0] || {};
    const thumbnail = String(info.thumburl || "");
    const source = String(info.descriptionurl || "");
    if (!thumbnail.startsWith("https://upload.wikimedia.org/") ||
        !source.startsWith("https://commons.wikimedia.org/")) continue;
    const meta = info.extmetadata || {};
    const value = item => clean(String(item?.value || "").replace(/<[^>]*>/g, " "), 180);
    items.push({
      title: clean(String(page.title || "").replace(/^File:/, "").replace(/_/g, " "), 160),
      thumbnail, imageUrl: String(info.url || ""), source,
      license: value(meta.LicenseShortName) || "Litsenziya sahifasida ko‘rsatilgan",
      licenseUrl: value(meta.LicenseUrl), artist: value(meta.Artist),
      attribution: "", provider: "Wikimedia Commons"
    });
  }
  return items.slice(0, limit);
}
async function searchImages(query, limit = 4) {
  const original = clean(query, 400);
  if (!imageIntent(original)) return [];
  const { place, queries } = normalizePlaceQuery(original);
  const key = queries.join("|").toLocaleLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.items;
  const max = Math.max(1, Math.min(4, limit));
  let items = [];
  let errors = [];
  try { items = await searchOpenverse(queries, place, max); }
  catch (error) { errors.push(String(error.message || error)); }
  if (items.length < max) {
    try {
      const commons = await searchCommons(queries, max - items.length);
      const seen = new Set(items.map(item => item.source));
      items.push(...commons.filter(item => !seen.has(item.source)));
    } catch (error) { errors.push(String(error.message || error)); }
  }
  const result = items.slice(0, max);
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL, items: result });
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  if (!result.length && errors.length) throw new Error(errors.join("; ").slice(0, 180));
  return result;
}
module.exports = { clean, imageIntent, buildImageQuery, normalizePlaceQuery, relevanceScore, searchImages };
