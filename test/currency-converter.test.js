"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseHourlyCompensation,
  getUsdRates,
  convertHourlyPayToUsd,
  clearRateCache
} = require("../modules/currency-converter");

test("parses explicit hourly compensation in USD and major foreign currencies", () => {
  assert.deepEqual(parseHourlyCompensation("$35-$45 per hour"), {
    amount: 35, currency: "USD", original: "$35-$45 per hour"
  });
  assert.equal(parseHourlyCompensation("€30–€35 per hour").currency, "EUR");
  assert.equal(parseHourlyCompensation("£32 per hour").currency, "GBP");
  assert.equal(parseHourlyCompensation("30 EUR/hour").currency, "EUR");
  assert.equal(parseHourlyCompensation("32 USD per hour").currency, "USD");
  assert.equal(parseHourlyCompensation("$35 per hour", "Toronto, Canada").currency, "CAD");
  assert.equal(parseHourlyCompensation("C$35 per hour").currency, "CAD");
  assert.equal(parseHourlyCompensation("30 EUR per month"), null);
});

test("loads and caches Frankfurter daily USD reference rates", async () => {
  clearRateCache();
  let calls = 0;
  const fetchImpl = async url => {
    calls += 1;
    assert.equal(url, "https://api.frankfurter.dev/v2/rates?base=USD");
    return {
      ok: true,
      async json() {
        return [
          { base: "USD", quote: "EUR", rate: 0.9, date: "2026-11-15" },
          { base: "USD", quote: "GBP", rate: 0.75, date: "2026-11-15" }
        ];
      }
    };
  };
  const first = await getUsdRates({ fetchImpl, forceRefresh: true });
  const second = await getUsdRates({ fetchImpl });
  assert.equal(first.rates.EUR, 0.9);
  assert.equal(second.rates.GBP, 0.75);
  assert.equal(calls, 1);
  clearRateCache();
});

test("converts foreign hourly wages into USD using the returned reference rate", async () => {
  const converted = await convertHourlyPayToUsd("Salary: €30-€35 per hour", "Berlin, Germany", {
    async fetchRates() {
      return { rates: { EUR: 0.9 }, date: "2026-11-15", source: "test daily reference" };
    }
  });
  assert.equal(converted.currency, "EUR");
  assert.equal(converted.amount, 30);
  assert.equal(converted.usdPerHour, 33.33);
  assert.equal(converted.rateDate, "2026-11-15");
});

test("keeps explicit USD wages independent of FX availability", async () => {
  const converted = await convertHourlyPayToUsd("USD 32 per hour", "", {
    async fetchRates() { throw new Error("FX should not be called for USD"); }
  });
  assert.equal(converted.usdPerHour, 32);
  assert.equal(converted.rateSource, "explicit USD pay");
});
