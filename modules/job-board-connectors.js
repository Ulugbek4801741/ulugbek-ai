"use strict";

const MAX_RESPONSE_BYTES = 1000000;
const REQUEST_TIMEOUT_MS = 8000;

function stripHtml(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_match, digits) => {
      const point = Number(digits);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
    })
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

function parseJobBoardUrl(value) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean).map(part => decodeURIComponent(part));
    if ((url.hostname === "boards.greenhouse.io" || url.hostname === "job-boards.greenhouse.io") &&
        parts.length >= 3 && parts[1] === "jobs" && /^\d+$/.test(parts[2]) &&
        /^[a-z0-9_-]+$/i.test(parts[0])) {
      return { provider: "greenhouse", board: parts[0], jobId: parts[2] };
    }
    if ((url.hostname === "jobs.lever.co" || url.hostname === "jobs.eu.lever.co") &&
        parts.length >= 2 && /^[a-z0-9_-]+$/i.test(parts[0]) &&
        /^[a-z0-9-]+$/i.test(parts[1])) {
      return { provider: "lever", region: url.hostname === "jobs.eu.lever.co" ? "eu" : "global", site: parts[0], postingId: parts[1] };
    }
  } catch (_) {}
  return null;
}

function salaryFromLever(data) {
  const range = data?.salaryRange || data?.salary;
  if (!range || typeof range !== "object") return "";
  const currency = String(range.currency || "USD").toUpperCase();
  const interval = String(range.interval || range.period || "").toLowerCase();
  const min = Number(range.min);
  const max = Number(range.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "";
  if (currency === "USD" && /hour|hourly|hr/.test(interval)) {
    return "Salary: $" + min + "-$" + max + " per hour";
  }
  return "Salary: " + currency + " " + min + "-" + max + " " + interval;
}

async function fetchOfficialJob(value, options = {}) {
  const parsed = parseJobBoardUrl(value);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (!parsed || typeof fetchImpl !== "function") return null;

  let endpoint;
  if (parsed.provider === "greenhouse") {
    endpoint = "https://boards-api.greenhouse.io/v1/boards/" +
      encodeURIComponent(parsed.board) + "/jobs/" + encodeURIComponent(parsed.jobId);
  } else {
    const host = parsed.region === "eu" ? "api.eu.lever.co" : "api.lever.co";
    endpoint = "https://" + host + "/v0/postings/" +
      encodeURIComponent(parsed.site) + "/" + encodeURIComponent(parsed.postingId);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(endpoint, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "ULUGBEK-AI-PublicJobVerifier/1.0" },
      redirect: "error",
      signal: controller.signal
    });
    if (!response || !response.ok) return null;
    const declaredLength = Number(response.headers?.get?.("content-length") || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) return null;
    const data = await response.json();
    if (!data || typeof data !== "object") return null;

    if (parsed.provider === "greenhouse") {
      const deadline = data.application_deadline ? Date.parse(data.application_deadline) : NaN;
      const expired = Number.isFinite(deadline) && deadline < (options.now ? Date.parse(options.now) : Date.now());
      if (!data.id || !data.absolute_url || expired) return null;
      const location = data.location?.name || "";
      const description = stripHtml(data.content || "");
      const content = [
        data.company_name ? "Employer: " + data.company_name : "",
        location ? "Location: " + location : "",
        description
      ].filter(Boolean).join("\n");
      return {
        title: stripHtml(data.title || ""),
        url: data.absolute_url,
        content,
        applicationUrl: data.absolute_url,
        officialStatus: "published",
        officialProvider: "greenhouse",
        publishedAt: data.first_published || "",
        updatedAt: data.updated_at || "",
        applicationDeadline: data.application_deadline || "",
        pageRead: true
      };
    }

    const applyUrl = String(data.applyUrl || "").trim();
    if (!applyUrl) return null;
    const description = stripHtml(data.descriptionPlain || data.text || data.description || "");
    const location = data.categories?.location || data.workplaceType || "";
    const content = [
      data.company ? "Employer: " + data.company : "",
      location ? "Location: " + location : "",
      salaryFromLever(data),
      description
    ].filter(Boolean).join("\n");
    return {
      title: stripHtml(data.text || data.title || ""),
      url: data.hostedUrl || value,
      content,
      applicationUrl: applyUrl,
      officialStatus: "published",
      officialProvider: "lever",
      publishedAt: data.createdAt || "",
      updatedAt: data.updatedAt || "",
      pageRead: true
    };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { parseJobBoardUrl, fetchOfficialJob, stripHtml, salaryFromLever };
