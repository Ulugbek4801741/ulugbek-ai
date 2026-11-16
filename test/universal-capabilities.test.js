"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const youtube = require("../modules/youtube-transcript");
const research = require("../modules/multi-source-research");

test("YouTube video IDs are accepted only from supported public URL forms", () => {
  assert.equal(youtube.extractVideoId("https://youtu.be/abcdefghijk"), "abcdefghijk");
  assert.equal(youtube.extractVideoId("https://www.youtube.com/watch?v=abcdefghijk"), "abcdefghijk");
  assert.equal(youtube.extractVideoId("https://example.com/watch?v=abcdefghijk"), null);
  assert.equal(youtube.extractVideoId("not-a-video-id"), null);
});

test("captionTracks JSON array parser handles nested arrays and escaped quotes", () => {
  const html = 'x "captionTracks":[{"baseUrl":"https://www.youtube.com/api/timedtext?a=1","name":{"simpleText":"English"}}],"other":1';
  const value = youtube.extractJsonArray(html, '"captionTracks"');
  assert.deepEqual(JSON.parse(value), [{ baseUrl: "https://www.youtube.com/api/timedtext?a=1", name: { simpleText: "English" } }]);
});

test("YouTube json3 transcript segments are combined and bounded", () => {
  const result = youtube.parseTranscriptPayload({ events: [
    { segs: [{ utf8: "Hello " }, { utf8: "world" }] },
    { segs: [{ utf8: "Second line" }] }
  ] });
  assert.equal(result, "Hello world\nSecond line");
  assert.equal(youtube.parseTranscriptPayload({}), "");
});

test("multi-source research deduplicates domains and distinguishes read from unread pages", async () => {
  const result = await research.compareSources("test question", {
    search: async () => [
      { title: "A", url: "https://www.alpha.example/a" },
      { title: "A2", url: "https://alpha.example/b" },
      { title: "B", url: "https://beta.example/a" },
      { title: "C", url: "https://gamma.example/a" }
    ],
    read: async url => url.includes("beta") ? null : ({ title: "Read", content: "x".repeat(120) })
  });
  assert.equal(result.sources.length, 3);
  assert.equal(result.independentDomains, 2);
  assert.equal(result.sourceCount, 2);
  assert.equal(result.verification.verifiedFacts, 0);
  assert.equal(result.verification.status, "evidence-collected-needs-claim-level-comparison");
});

test("multi-source research rejects empty queries", async () => {
  await assert.rejects(() => research.compareSources("  "), { statusCode: 400 });
});
