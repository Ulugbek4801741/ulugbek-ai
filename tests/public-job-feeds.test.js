"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const feeds = require("../modules/public-job-feeds");

test("normalizes only recent public remote job records with secure apply links", () => {
  const now = Date.parse("2026-11-16T10:00:00Z");
  const good = feeds.normalizeRecord({
    title: "Python Software Developer",
    company_name: "Example Labs",
    candidate_required_location: "Worldwide",
    description: "Build Python services. Contact Telegram: @example_jobs",
    url: "https://remotive.com/remote-jobs/software-dev/python-developer-123",
    publication_date: "2026-11-15T10:00:00Z",
    salary: "$30-$40 per hour"
  }, "remotive", now);
  assert.ok(good);
  assert.equal(good.remote, true);
  assert.equal(good.officialStatus, "published");
  assert.equal(good.applicationUrl, good.url);
  assert.equal(feeds.normalizeRecord({
    title: "Old job", company_name: "Old Co", url: "https://remotive.com/jobs/1",
    publication_date: "2026-01-01T00:00:00Z"
  }, "remotive", now), null);
  assert.equal(feeds.normalizeRecord({
    title: "Unsafe link", company_name: "Bad Co", url: "http://example.com/job",
    publication_date: "2026-11-15T10:00:00Z"
  }, "remotive", now), null);
});

test("queries public feeds and deduplicates structured job records", async () => {
  const now = Date.parse("2026-11-16T10:00:00Z");
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    let payload;
    if (url.includes("remotive.com")) payload = { jobs: [{
      title: "Python Developer", company_name: "Remote Co", candidate_required_location: "Worldwide",
      description: "Python backend development", url: "https://remotive.com/remote-jobs/1",
      publication_date: "2026-11-15T10:00:00Z", salary: "$35 per hour"
    }] };
    else if (url.includes("remoteok.com")) payload = [{
      id: 1, position: "Backend Developer", company: "RO Co", location: "Worldwide",
      description: "Node and Python backend", url: "https://remoteok.com/remote-jobs/2",
      apply_url: "https://remoteok.com/remote-jobs/2/apply", date: "2026-11-15T10:00:00Z"
    }];
    else payload = { data: [{
      title: "Remote QA Engineer", company_name: "Work Co", location: "Remote worldwide", remote: true,
      description: "QA testing", url: "https://www.arbeitnow.com/jobs/3",
      created_at: "2026-11-15T10:00:00Z"
    }] };
    return { ok: true, status: 200, headers: { get: () => "500" }, text: async () => JSON.stringify(payload) };
  };
  const result = await feeds.fetchPublicJobFeeds("dunyo bo'ylab dasturchi masofaviy ish", { fetchImpl, now });
  assert.equal(result.feedsChecked, 3);
  assert.equal(result.results.length, 3);
  assert.ok(result.providers.includes("remotive"));
  assert.ok(calls.some(url => url.includes("remoteok.com")));
  assert.ok(calls.some(url => url.includes("arbeitnow.com")));
});

test("feed query terms include the user's programming language", () => {
  assert.ok(feeds.buildFeedQueries("Python dasturchi ish").includes("python"));
});
