"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseJobBoardUrl, fetchOfficialJob } = require("../modules/job-board-connectors");

test("recognizes public Greenhouse and Lever vacancy URLs only", () => {
  assert.deepEqual(parseJobBoardUrl("https://boards.greenhouse.io/acme/jobs/12345"), {
    provider: "greenhouse", board: "acme", jobId: "12345"
  });
  assert.deepEqual(parseJobBoardUrl("https://jobs.eu.lever.co/acme/abc-123"), {
    provider: "lever", region: "eu", site: "acme", postingId: "abc-123"
  });
  assert.equal(parseJobBoardUrl("http://127.0.0.1/admin"), null);
  assert.equal(parseJobBoardUrl("https://example.com/jobs/123"), null);
});

test("verifies a Greenhouse listing through its public job-board API", async () => {
  let requested = "";
  const job = await fetchOfficialJob("https://boards.greenhouse.io/acme/jobs/12345", {
    now: "2026-11-16T12:00:00Z",
    async fetchImpl(url, options) {
      requested = url;
      assert.equal(options.redirect, "error");
      return {
        ok: true,
        headers: { get() { return "700"; } },
        async json() {
          return {
            id: 12345,
            internal_job_id: 999,
            title: "Senior Analyst",
            company_name: "Acme",
            location: { name: "Remote — Worldwide" },
            absolute_url: "https://boards.greenhouse.io/acme/jobs/12345",
            first_published: "2026-11-10T12:00:00Z",
            updated_at: "2026-11-15T12:00:00Z",
            application_deadline: "2026-12-01T00:00:00Z",
            content: "<p>Salary: $40 per hour. Requirements: experience.</p>"
          };
        }
      };
    }
  });
  assert.match(requested, /boards-api\.greenhouse\.io\/v1\/boards\/acme\/jobs\/12345/);
  assert.equal(job.officialStatus, "published");
  assert.equal(job.officialProvider, "greenhouse");
  assert.match(job.content, /Salary: \$40 per hour/);
  assert.equal(job.applicationUrl, "https://boards.greenhouse.io/acme/jobs/12345");
});

test("rejects unpublished or expired Greenhouse jobs", async () => {
  const fetchImpl = async () => ({
    ok: true,
    headers: { get() { return null; } },
    async json() {
      return {
        internal_job_id: null,
        title: "Prospect",
        absolute_url: "https://boards.greenhouse.io/acme/jobs/12345",
        application_deadline: "2026-11-01T00:00:00Z"
      };
    }
  });
  const job = await fetchOfficialJob("https://boards.greenhouse.io/acme/jobs/12345", {
    now: "2026-11-16T12:00:00Z", fetchImpl
  });
  assert.equal(job, null);
});

test("verifies published Lever postings and preserves the application URL and hourly pay", async () => {
  let requested = "";
  const job = await fetchOfficialJob("https://jobs.lever.co/acme/abc-123", {
    async fetchImpl(url) {
      requested = url;
      return {
        ok: true,
        headers: { get() { return null; } },
        async json() {
          return {
            text: "Support Engineer",
            hostedUrl: "https://jobs.lever.co/acme/abc-123",
            applyUrl: "https://jobs.lever.co/acme/abc-123/apply",
            company: "Acme",
            categories: { location: "Worldwide remote" },
            salaryRange: { currency: "USD", interval: "hourly", min: 35, max: 45 },
            descriptionPlain: "Support customers and maintain systems. Requirements: experience."
          };
        }
      };
    }
  });
  assert.match(requested, /api\.lever\.co\/v0\/postings\/acme\/abc-123/);
  assert.equal(job.officialStatus, "published");
  assert.equal(job.officialProvider, "lever");
  assert.equal(job.applicationUrl, "https://jobs.lever.co/acme/abc-123/apply");
  assert.match(job.content, /Salary: \$35-\$45 per hour/);
});
