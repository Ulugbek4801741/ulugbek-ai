"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const CONFIG = path.join(ROOT, ".github", "autonomous-upstream-sources.json");
const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_FILE = path.join(REPORT_DIR, "autonomous-upstream-review.json");
const TIMEOUT_MS = 12000;
const USER_AGENT = "ULUGBEK-AI-Autonomous-Maintenance/1.0";

async function requestJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": USER_AGENT
      },
      signal: controller.signal
    });
    if (!response.ok) {
      const error = new Error("GitHub API returned HTTP " + response.status);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function licenseDecision(spdx, allowed) {
  if (!spdx) return "license-not-declared-review-required";
  return allowed.includes(spdx) ? "permissive-license-review-still-required" : "do-not-copy-code-review-license";
}

function trimText(value, limit = 1800) {
  return String(value || "").replace(/\r/g, "").trim().slice(0, limit);
}

function trimWords(value, maxWords = 100) {
  return String(value || "").replace(/\s+/g, " ").trim().split(" ").slice(0, maxWords).join(" ");
}

async function inspectRepository(entry, allowedLicenses) {
  const encoded = entry.fullName.split("/").map(encodeURIComponent).join("/");
  const base = "https://api.github.com/repos/" + encoded;
  const result = {
    repository: entry.fullName,
    reason: entry.reason,
    fetchedAt: new Date().toISOString(),
    status: "pending",
    reviewRequired: true
  };

  try {
    const metadata = await requestJson(base);
    result.description = trimText(metadata.description, 500);
    result.htmlUrl = metadata.html_url;
    result.defaultBranch = metadata.default_branch;
    result.stars = metadata.stargazers_count;
    result.pushedAt = metadata.pushed_at;
    result.license = metadata.license && metadata.license.spdx_id || null;
    result.licenseDecision = licenseDecision(result.license, allowedLicenses);

    try {
      const release = await requestJson(base + "/releases/latest");
      result.latestRelease = {
        tag: release.tag_name,
        publishedAt: release.published_at,
        url: release.html_url,
        notes: trimWords(release.body, 100)
      };
    } catch (error) {
      result.latestRelease = { status: error.status === 404 ? "no-published-release" : "unavailable" };
    }

    try {
      const readme = await requestJson(base + "/readme");
      const decoded = Buffer.from(readme.content || "", "base64").toString("utf8");
      result.readmeExcerpt = trimWords(decoded, 100);
    } catch (error) {
      result.readmeExcerpt = "README could not be retrieved.";
    }

    result.status = "review-candidate";
  } catch (error) {
    result.status = "fetch-failed";
    result.error = String(error.message || "Unknown fetch error").slice(0, 240);
  }
  return result;
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG, "utf8"));
  const results = await Promise.all(config.repositories.map(entry =>
    inspectRepository(entry, config.allowedLicenses || [])
  ));
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "read-only-public-source-review",
    automaticCodeImport: false,
    automaticDependencyInstall: false,
    automaticModelTraining: false,
    note: "This report collects public metadata, release notes and short README excerpts. It does not execute upstream code, copy code, or modify ULUGBEK AI source files.",
    repositories: results
  };

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });

  const summary = [
    "## ULUGBEK AI — ochiq manbalarni kuzatish",
    "",
    "Rejim: faqat o‘qish va tahlil. Tashqi kod ishga tushirilmadi yoki loyihaga ko‘chirilmadi.",
    "",
    "| Ombor | Holat | Litsenziya | Yulduz | So‘nggi yangilanish |",
    "|---|---|---|---:|---|"
  ];
  for (const item of results) {
    summary.push("| [" + item.repository + "](" + (item.htmlUrl || "https://github.com/" + item.repository) + ") | " +
      item.status + " | " + (item.license || "aniqlanmadi") + " | " +
      (Number.isFinite(item.stars) ? item.stars : "—") + " | " + (item.pushedAt || "—") + " |");
  }
  summary.push("", "Hisobot fayli: reports/autonomous-upstream-review.json");
  summary.push("Kod qabul qilishdan oldin litsenziya, xavfsizlik, moslik va testlar alohida tekshirilishi shart.");

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary.join("\n") + "\n");
  } else {
    process.stdout.write(summary.join("\n") + "\n");
  }

  if (results.every(item => item.status === "fetch-failed")) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write("Autonomous research failed: " + String(error.message || error) + "\n");
  process.exitCode = 1;
});
