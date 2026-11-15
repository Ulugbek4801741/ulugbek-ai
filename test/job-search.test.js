"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { detectSearchIntent, buildUniversalSearchQuery, buildUniversalSearchQueries, searchWeb, evidenceEntries, formatEvidenceReply } = require("../modules/universal-web-search");
const { knowledgeContext, SYSTEM_PROMPT } = require("../modules/single-agent");
const { isJobSearchRequest, hasLocationHint, locationClarification, searchJobs, cleanText, decodeHtmlEntities, buildJobSearchQueries, extractPhones, extractSalary, extractJobRole } = require("../modules/job-search");

test("researches every substantive question and task, not only explicit search commands", () => {
  for (const q of ["Bugun ob-havo qanday?", "Bugungi eng so'nggi yangiliklarni top", "Shveysariyada traktorchi ish topish", "Menga vakansiya qidirib ber", "YouTube kanalining linkini topib ber", "JavaScriptda API server qanday yoziladi?", "O'zbekistonda kichik biznesni qanday boshlash mumkin?", "Fotosintez nima?", "Qonuniy shartnoma qanday tuziladi?", "Menga ingliz tilidan yordam ber", "Menga dasturlashda yordam ber"]) assert.equal(detectSearchIntent(q).shouldSearch, true, q);
  assert.equal(detectSearchIntent("Assalomu alaykum").shouldSearch, false);
  assert.equal(detectSearchIntent("25 * 4").shouldSearch, false);
});
test("keeps greetings, thanks and arithmetic local", () => {
  assert.equal(detectSearchIntent("Assalomu alaykum").shouldSearch, false);
  assert.equal(detectSearchIntent("Katta rahmat").shouldSearch, false);
  assert.equal(detectSearchIntent("25 * 4").shouldSearch, false);
});
test("detects job and platform search intents", () => {
  assert.equal(detectSearchIntent("Ish topib ber").isJobSearch, true);
  assert.equal(detectSearchIntent("Menga vakansiya top").isJobSearch, true);
  assert.equal(detectSearchIntent("YouTube kanalining linkini topib ber").shouldSearch, true);
  assert.ok(detectSearchIntent("Instagram profil manzilini top").platforms.includes("site:instagram.com"));
});
test("creates multiple distinct search queries for independent discovery", () => {
  const queries = buildUniversalSearchQueries("Telegramdagi rasmiy kanal linkini top");
  assert.equal(queries.length, 3);
  assert.ok(queries[0].includes("Telegramdagi"));
  assert.ok(queries[1].includes("site:t.me"));
  assert.match(queries[2], /rasmiy sayt/);
  assert.match(buildUniversalSearchQuery("Traktor operatori uchun ish top"), /jobs vacancies/);
});
test("reads pages, searches in parallel and deduplicates results from same URL", async () => {
  const calls = [];
  const web = {
    async search(q) { calls.push(q); return [{ title: "Example", url: "https://example.org/a", snippet: "short" }, { title: "Second", url: "https://gov.example/a", snippet: "short" }]; },
    async fetchPage(url) { return { title: "Read " + url, url, content: "Full page text and evidence. ".repeat(60) }; }
  };
  const result = await searchWeb("Fotosintez nima?", web);
  assert.equal(calls.length, 3);
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].pageRead, true);
  assert.ok(result.results[0].snippet.length > 1000);
});
test("keeps source metadata in evidence entries", () => {
  const entries = evidenceEntries([{ title: "Example", snippet: "Full text", url: "https://example.org", pageRead: true, qualityScore: 2 }]);
  assert.equal(entries[0].status, "unverified-public-page-content");
  assert.equal(entries[0].sourceQuality, 2);
});
test("fallback does not present an unread search snippet as verified evidence", () => {
  const reply = formatEvidenceReply([{ title: "Public source", snippet: "Useful evidence", url: "https://example.org", pageRead: false }]);
  assert.match(reply, /yetarli tasdiqlangan dalil topilmadi/);
  assert.match(reply, /Qidiruv parchalari fakt sifatida qabul qilinmadi/);
  assert.equal(reply.includes("Useful evidence"), false);
  assert.equal(reply.includes("https://example.org"), false);
});
test("no-result and search errors are explicit", async () => {
  const empty = await searchWeb("Ish topib ber", { search: async () => [] });
  assert.equal(empty.results.length, 0);
  const broken = await searchWeb("Fotosintez nima?", { search: async () => { throw new Error("offline"); } });
  assert.equal(broken.ok, true);
  assert.equal(broken.results.length, 0);
});
test("language model instructions require direct answers grounded in evidence", () => {
  assert.match(SYSTEM_PROMPT, /foydalanuvchining asl maqsadiga/);
  assert.match(SYSTEM_PROMPT, /birlamchi rasmiy manbalarni ustun qo'ying/);
  const context = knowledgeContext([{ title: "Test", content: "Page text", source: "https://example.org", status: "unverified-public-page-content" }]);
  assert.match(context, /Page text/);
  assert.match(context, /https:\/\/example\.org/);
});

test("asks for a target location before searching a vague job request", () => {
  assert.equal(hasLocationHint("Ish topib ber"), false);
  assert.equal(hasLocationHint("Shveysariyada traktorchi ish topish"), true);
  assert.equal(hasLocationHint("O'zbekistonda ish topib ber"), true);
  assert.equal(hasLocationHint("Buxoroda ish qidirib ber"), true);
  assert.match(locationClarification(), /qaysi davlat yoki shaharda/);
});

test("job search detects job intent and returns read public listing details", async () => {
  assert.equal(isJobSearchRequest("Ish topib ber"), true);
  const result = await searchJobs("Shveysariyada traktorchi ish topish", {
    async search(query) {
      assert.match(query, /Shveysariyada/);
      return [{ title: "Tractor operator vacancy", url: "https://jobs.example.org/tractor/123", snippet: "Tractor operator vacancy." }];
    },
    async fetchPage(url) {
      return { title: "Tractor operator vacancy", url, content: "Vakansiya: Traktor operatori\nIsh beruvchi: Example Farm AG\nManzil: Zurich, Switzerland\nMaosh: 5 000 CHF per month\nTalablar: 2 years experience, tractor licence required\nTelefon: +41 44 123 45 67\nAriza topshirish uchun ish beruvchiga murojaat qiling. ".repeat(4) };
    }
  });
  assert.equal(result.results.length, 1);
  assert.match(result.reply, /Tractor operator vacancy/);
  assert.match(result.reply, /Example Farm AG/);
  assert.match(result.reply, /\+41441234567/);
  assert.match(result.reply, /5 000 CHF/);
  assert.match(result.reply, /https:\/\/jobs\.example\.org\/tractor\/123/);
  assert.equal(result.results[0].pageRead, true);
});

test("job search output decodes nested HTML entities from search snippets", () => {
  assert.equal(decodeHtmlEntities("bo&amp;#x27;sh ish o&amp;#x27;rni"), "bo'sh ish o'rni");
  assert.equal(cleanText("Buxoroda bo&amp;#x27;sh ish o&amp;#x27;rinlari"), "Buxoroda bo'sh ish o'rinlari");
  assert.equal(cleanText("A &amp;amp; B"), "A & B");
});


test("builds several location-preserving job searches and extracts contact and pay", () => {
  const queries = buildJobSearchQueries("Kogondan traktorchi ish topib ber");
  assert.ok(queries.length >= 4);
  assert.ok(queries.every(query => query.includes("Kogondan")));
  assert.deepEqual(extractPhones("Telefon: +998 90 123 45 67"), ["+998901234567"]);
  assert.match(extractSalary("Maosh: 5 000 000 so'm"), /5 000 000 so'm/);
});

test("returns at most ten unique individual vacancy pages and never treats category pages as vacancies", async () => {
  const result = await searchJobs("Kogondan ish topib ber", {
    async search() {
      return Array.from({ length: 10 }, (_, index) => ({
        title: "Kogon vacancy " + index,
        url: "https://jobs.example.org/vacancy/" + index,
        snippet: "Vakansiya va talablar"
      }));
    },
    async fetchPage(url) {
      const id = url.split("/").pop();
      return {
        title: "Kogon vacancy " + id,
        url,
        content: ("Vakansiya: Ishchi " + id + "\nIsh beruvchi: Kogon korxonasi\nMaosh: 4 000 000 so'm\nTalablar: tajriba kerak\nTelefon: +998 90 123 45 67\nAriza topshirish uchun bog'laning. ").repeat(3)
      };
    }
  });
  assert.equal(result.results.length, 10);
  assert.match(result.reply, /10 ta alohida vakansiya/);
  assert.match(result.reply, /https:\/\/jobs\.example\.org\/vacancy\/0/);
});

test("recognizes a programmer profession and adds role-specific job searches", () => {
  const request = "Ish topib ber Toshkent shahridan. Men dasturchiman, shu yo'nalishda izlab topib ber.";
  const role = extractJobRole(request);
  assert.equal(role.label, "Dasturchi");
  const queries = buildJobSearchQueries(request);
  assert.ok(queries.some(query => /programmer developer software engineer/i.test(query)));
  assert.ok(queries.every(query => query.includes("Toshkent")));
});

test("job search sends profession-specific queries and returns a direct listing link", async () => {
  const calls = [];
  const result = await searchJobs("Ish topib ber Toshkent shahridan. Men dasturchiman shu yo'nalishda", {
    async search(query) {
      calls.push(query);
      return [{ title: "Junior Node.js Developer", url: "https://jobs.example.org/vacancy/node-42", snippet: "Developer vacancy" }];
    },
    async fetchPage(url) {
      return { title: "Junior Node.js Developer", url, content: ("Vakansiya: Junior Node.js Developer\\nIsh beruvchi: Example Tech\\nManzil: Toshkent\\nMaosh: 8 000 000 so'm\\nTalablar: JavaScript Node.js REST API tajriba\\nTelefon: +998 90 123 45 67\\nAriza topshirish uchun murojaat qiling. ").repeat(3) };
    }
  });
  assert.ok(calls.some(query => /programmer developer software engineer/i.test(query)));
  assert.equal(result.requestedRole, "Dasturchi");
  assert.equal(result.results.length, 1);
  assert.match(result.reply, /Junior Node.js Developer/);
  assert.ok(result.reply.includes("https://jobs.example.org/vacancy/node-42"));
});

test("recognizes colloquial Uzbek programming request and adds Kogon-specific searches", () => {
  const request = "Kogondan ish topib ber Dasturlash bo‘yicha";
  assert.equal(isJobSearchRequest(request), true);
  assert.equal(hasLocationHint(request), true);
  assert.equal(extractJobRole(request).label, "Dasturchi");
  const queries = buildJobSearchQueries(request);
  assert.ok(queries.some(query => /Kogon/.test(query)));
  assert.ok(queries.some(query => /junior frontend backend Python JavaScript/i.test(query)));
});
test("does not present unrelated vacancies as programming jobs in Kogon", async () => {
  const result = await searchJobs("Kogondan ish topib ber Dasturlash bo‘yicha", {
    async search() {
      return [
        { title: "Ombor ishchisi", url: "https://jobs.example.org/kogon/warehouse", snippet: "Kogon vakansiya omborchi" },
        { title: "Junior Python Developer", url: "https://jobs.example.org/kogon/python", snippet: "Kogon dasturchi vakansiya" }
      ];
    },
    async fetchPage(url) {
      if (url.endsWith("warehouse")) return { title: "Ombor ishchisi", url, content: ("Kogon ombor ishchisi. Ish beruvchi: Kogon. Maosh: 4 000 000 so'm. Talablar: tajriba. Telefon: +998 90 123 45 67. ").repeat(3) };
      return { title: "Junior Python Developer", url, content: ("Kogon shahrida Junior Python Developer vakansiyasi. Ish beruvchi: Tech Kogon. Maosh: 5 000 000 so'm. Talablar: Python dasturlash tajribasi. Telefon: +998 90 123 45 67. ").repeat(3) };
    }
  });
  assert.equal(result.results.length, 1);
  assert.match(result.results[0].title, /Python Developer/);
});

test("explains that no Kogon programmer vacancy page was verified", async () => {
  const result = await searchJobs("Kogondan ish topib ber Dasturlash bo‘yicha", {
    async search() { return []; }
  });
  assert.match(result.reply, /Kogon hududida dasturchi/);
  assert.match(result.reply, /umumiy ish saytlari/);
});
