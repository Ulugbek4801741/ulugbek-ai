"use strict";

const FX_URL = "https://api.frankfurter.dev/v2/rates?base=USD";
const CACHE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 7000;
let cachedRates = null;

const CURRENCIES = [
  ["CAD", "C\\$|CAD"], ["AUD", "A\\$|AUD"], ["NZD", "NZ\\$|NZD"], ["SGD", "S\\$|SGD"],
  ["USD", "US\\$|USD|\\$"], ["EUR", "EUR|€"], ["GBP", "GBP|£"], ["CHF", "CHF"],
  ["PLN", "PLN|zł"], ["CZK", "CZK"], ["HUF", "HUF"], ["SEK", "SEK"],
  ["NOK", "NOK"], ["DKK", "DKK"], ["AED", "AED"], ["SAR", "SAR"],
  ["INR", "INR|₹"], ["ZAR", "ZAR"], ["BRL", "BRL|R\\$"], ["MXN", "MXN"],
  ["TRY", "TRY"], ["ILS", "ILS"], ["JPY", "JPY"], ["KRW", "KRW"],
  ["PHP", "PHP"], ["THB", "THB"], ["IDR", "IDR"], ["MYR", "MYR"],
  ["HKD", "HKD"], ["TWD", "TWD"], ["CNY", "CNY"]
];

function parseNumber(value) {
  const number = Number(String(value || "").replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseHourlyCompensation(value, location = "") {
  const text = String(value || "");
  const interval = "(?:per\\\\s*hour|\\\\/\\\\s*(?:h|hr|hour)|hourly|an\\\\s*hour|soatiga)";
  if (!new RegExp(interval, "iu").test(text)) return null;
  const amount = "(\\\\d{1,4}(?:[.,]\\\\d{1,2})?)";
  for (const [currency, token] of CURRENCIES) {
    let effectiveCurrency = currency;
    if (currency === "USD" && /\\$/.test(text) && !/(?:USD|US\\$)/i.test(text)) {
      if (/\\bcanada\\b/i.test(location)) effectiveCurrency = "CAD";
      else if (/\\baustralia\\b/i.test(location)) effectiveCurrency = "AUD";
      else if (/\\bnew\\s*zealand\\b/i.test(location)) effectiveCurrency = "NZD";
      else if (/\\bsingapore\\b/i.test(location)) effectiveCurrency = "SGD";
    }
    const tokenGroup = "(?:" + token + ")";
    const prefix = new RegExp(tokenGroup + "\\\\s*" + amount +
      "(?:\\\\s*(?:-|–|to)\\\\s*" + tokenGroup + "\\\\s*\\\\d{1,4}(?:[.,]\\\\d{1,2})?)?\\\\s*" + interval, "iu");
    const suffix = new RegExp(amount + "\\\\s*" + tokenGroup + "\\\\s*" + interval, "iu");
    const match = text.match(prefix) || text.match(suffix);
    if (match) {
      const minimum = parseNumber(match[1]);
      if (minimum !== null) return { amount: minimum, currency: effectiveCurrency, original: match[0].trim() };
    }
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
