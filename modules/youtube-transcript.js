"use strict";

const MAX_TRANSCRIPT_CHARS = 120000;
const TIMEOUT_MS = 12000;

function extractVideoId(value) {
  const raw = String(value || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname)) return null;
    const id = url.hostname === "youtu.be" ? url.pathname.slice(1).split("/")[0] :
      url.pathname === "/watch" ? url.searchParams.get("v") :
      (url.pathname.match(/^\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/) || [])[1];
    return /^[a-zA-Z0-9_-]{11}$/.test(id || "") ? id : null;
  } catch (_) { return null; }
}

function extractJsonArray(source, marker) {
  const startAt = source.indexOf(marker);
  if (startAt < 0) return null;
  const start = source.indexOf("[", startAt + marker.length);
  if (start < 0) return null;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) return source.slice(start, i + 1);
  }
  return null;
}

function decodeText(value) {
  return String(value || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n))));
}

function parseTranscriptPayload(payload) {
  let data = payload;
  if (typeof payload === "string") {
    try { data = JSON.parse(payload); } catch (_) { data = null; }
  }
  if (!data || !Array.isArray(data.events)) return "";
  const lines = [];
  for (const event of data.events) {
    const line = (event.segs || []).map(part => String(part.utf8 || "")).join("")
      .replace(/\s+/g, " ").trim();
    if (line && line !== "\n") lines.push(line);
  }
  return lines.join("\n").slice(0, MAX_TRANSCRIPT_CHARS);
}

async function getTranscript(input, options = {}) {
  const videoId = extractVideoId(input);
  if (!videoId) throw Object.assign(new Error("Ochiq YouTube video havolasi yoki 11 belgili video ID kiriting."), { statusCode: 400 });
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw Object.assign(new Error("HTTP mijoz mavjud emas."), { statusCode: 503 });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const watchUrl = "https://www.youtube.com/watch?v=" + videoId;
    const page = await fetchImpl(watchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ULUGBEK-AI/1.0)", "Accept-Language": "en-US,en;q=0.8" },
      redirect: "error", signal: controller.signal
    });
    if (!page.ok) throw Object.assign(new Error("YouTube sahifasi ochilmadi: HTTP " + page.status), { statusCode: 502 });
    const html = await page.text();
    if (Buffer.byteLength(html, "utf8") > 5_000_000) throw Object.assign(new Error("YouTube sahifasi hajmi limitdan oshdi."), { statusCode: 413 });
    const array = extractJsonArray(html, '"captionTracks"');
    if (!array) throw Object.assign(new Error("Bu videoda ochiq subtitr topilmadi yoki YouTube subtitr ma’lumotini bermadi."), { statusCode: 404 });
    let tracks;
    try { tracks = JSON.parse(array); } catch (_) { throw Object.assign(new Error("Subtitr ma’lumotini o‘qib bo‘lmadi."), { statusCode: 502 }); }
    const track = tracks.find(item => item && typeof item.baseUrl === "string" && item.kind !== "asr") || tracks.find(item => item && typeof item.baseUrl === "string");
    if (!track) throw Object.assign(new Error("Ochiq subtitr mavjud emas."), { statusCode: 404 });
    const captionUrl = new URL(decodeText(track.baseUrl));
    if (captionUrl.protocol !== "https:" || !["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"].includes(captionUrl.hostname)) {
      throw Object.assign(new Error("Subtitr manzili xavfsizlik tekshiruvidan o‘tmadi."), { statusCode: 502 });
    }
    captionUrl.searchParams.set("fmt", "json3");
    const captionResponse = await fetchImpl(captionUrl.href, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ULUGBEK-AI/1.0)" },
      redirect: "error", signal: controller.signal
    });
    if (!captionResponse.ok) throw Object.assign(new Error("Subtitr faylini yuklab bo‘lmadi: HTTP " + captionResponse.status), { statusCode: 502 });
    const transcript = parseTranscriptPayload(await captionResponse.text());
    if (!transcript) throw Object.assign(new Error("Subtitr matni bo‘sh yoki qo‘llab-quvvatlanmaydigan formatda."), { statusCode: 404 });
    return {
      videoId, videoUrl: watchUrl, language: String(track.languageCode || "unknown"),
      languageName: String(track.name?.simpleText || track.languageCode || "Noma’lum"),
      isAutoGenerated: track.kind === "asr", transcript,
      characters: transcript.length, retrievedAt: new Date().toISOString(),
      note: "Faqat YouTube ochiq sahifasida taqdim etilgan subtitr o‘qildi; audio/video fayl yuklab olinmadi."
    };
  } finally { clearTimeout(timer); }
}

function status() {
  return { ready: true, mode: "public-captions-only", loginRequired: false,
    audioTranscription: false, privateOrMembersOnlyVideos: false,
    note: "Ochiq subtitr bo‘lsa o‘qiydi. Subtitrsiz videoni audio orqali transkripsiya qilish uchun alohida ASR xizmati kerak." };
}

module.exports = { extractVideoId, extractJsonArray, parseTranscriptPayload, getTranscript, status };
