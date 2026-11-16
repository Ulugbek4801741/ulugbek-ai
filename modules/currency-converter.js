"use strict";

const FX_URL = "https://api.frankfurter.dev/v2/rates?base=USD";
const CACHE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 7000;
let cachedRates = null;

const HOURLY_PAY_PATTERNS = [
  { currency: "CAD", regex: /(?:C\$|CAD)\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:(?:C\$|CAD)\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "AUD", regex: /(?:A\$|AUD)\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:(?:A\$|AUD)\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "NZD", regex: /(?:NZ\$|NZD)\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:(?:NZ\$|NZD)\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "SGD", regex: /(?:S\$|SGD)\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:(?:S\$|SGD)\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "USD", regex: /(?:USD|US\$|\$)\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:(?:USD|US\$|\$)\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "EUR", regex: /(?:EUR|€)\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:(?:EUR|€)\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "GBP", regex: /(?:GBP|£)\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:(?:GBP|£)\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "CHF", regex: /CHF\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:CHF\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "PLN", regex: /(?:PLN|zł)\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:(?:PLN|zł)\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "INR", regex: /(?:INR|₹)\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:(?:INR|₹)\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "AED", regex: /AED\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:AED\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "ZAR", regex: /ZAR\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:ZAR\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "BRL", regex: /(?:BRL|R\$)\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:(?:BRL|R\$)\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu },
  { currency: "MXN", regex: /MXN\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\s*(?:-|–|to)\s*(?:MXN\s*)?\d{1,4}(?:[.,]\d{1,2})?)?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour|soatiga)/iu }
];

function parseNumber(value) {
  const number = Number(String(value || "").replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseHourlyCompensation(value, location = "") {
  const text = String(value || "");
  for (const item of HOURLY_PAY_PATTERNS) {
    const match = text.match(item.regex);
    if (!match) continue;
    let currency = item.currency;
    if (currency === "USD" && /\$/.test(match[0]) && !/(?:USD|US\$)/i.test(match[0])) {
      if (/\bcanada\b/i.test(location)) currency = "CAD";
      else if (/\baustralia\b/i.test(location)) currency = "AUD";
      else if (/\bnew\s*zealand\b/i.test(location)) currency = "NZD";
      else if (/\bsingapore\b/i.test(location)) currency = "SGD";
    }
    const amount = Number(String(match[1]).replace(",", "."));
    if (Number.isFinite(amount) && amount > 0) return { amount, currency, original: match[0].trim() };
  }
  return null;
}

async function getUsdRates(options = {}) {
  const now = options.now ? new Date(options.now).getTime() : Date.now();
  if (!options.forceRefresh && cachedRates && now - cachedRates.fetchedAt < CACHE_TTL_MS) return cachedRates;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(FX_URL, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "ULUGBEK-AI-PublicFX/1.0" },
      redirect: "error",
      signal: controller.signal
    });
    if (!response || !response.ok) return null;
    const rows = await response.json();
    if (!Array.isArray(rows)) return null;
    const rates = { USD: 1 };
    let date = "";
    for (const row of rows) {
      const quote = String(row && row.quote || "").toUpperCase();
      const rate = Number(row && row.rate);
      if (/^[A-Z]{3}$/.test(quote) && Number.isFinite(rate) && rate > 0) rates[quote] = rate;
      if (!date && row && row.date) date = String(row.date);
    }
    cachedRates = { rates, date, fetchedAt: now, source: "Frankfurter daily reference rates" };
    return cachedRates;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function convertHourlyPayToUsd(value, location = "", options = {}) {
  const parsed = parseHourlyCompensation(value, location);
  if (!parsed) return null;
  if (parsed.currency === "USD") {
    return { ...parsed, usdPerHour: parsed.amount, rateDate: "", rateSource: "explicit USD pay" };
  }
  const rates = typeof options.fetchRates === "function"
    ? await options.fetchRates()
    : await getUsdRates({ fetchImpl: options.fetchImpl, forceRefresh: options.forceRefresh });
  const usdToLocal = Number(rates && rates.rates && rates.rates[parsed.currency]);
  if (!Number.isFinite(usdToLocal) || usdToLocal <= 0) return null;
  return {
    ...parsed,
    usdPerHour: Number((parsed.amount / usdToLocal).toFixed(2)),
    rateDate: rates.date || "",
    rateSource: rates.source || "Frankfurter daily reference rates"
  };
}

function clearRateCache() {
  cachedRates = null;
}

module.exports = { parseHourlyCompensation, getUsdRates, convertHourlyPayToUsd, clearRateCache };
