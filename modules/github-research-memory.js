"use strict";

const ALLOWED_LICENSES = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC"]);

function trimWords(value, maxWords = 100) {
  return String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).slice(0, maxWords).join(" ");
}

function buildKnowledgeEntries(report) {
  if (!report || !Array.isArray(report.repositories)) return [];
  const generatedAt = String(report.generatedAt || new Date().toISOString());
  const snapshotId = generatedAt.replace(/[^0-9A-Za-z]/g, "");
  return report.repositories
    .filter(repo => repo && repo.status === "review-candidate" && ALLOWED_LICENSES.has(repo.license))
    .map(repo => {
      const readme = trimWords(repo.readmeExcerpt, 100);
      const releaseNotes = trimWords(repo.latestRelease?.notes, 100);
      const content = [readme, releaseNotes].filter(Boolean).join(" ").trim();
      if (content.split(/\s+/).filter(Boolean).length < 20 || !repo.url) return null;
      return {
        id: "github-research-" + snapshotId + "-" + String(repo.repository || "source").replace(/[^a-z0-9-]/gi, "-"),
        title: String(repo.repository || "Open-source repository") + " — README and release research notes",
        content,
        source: String(repo.url) + "#ulugbek-research-" + snapshotId,
        language: "en",
        agent: "AutonomousGitHubResearchAgent",
        status: "pending-review",
        quality: "permissive-license-open-source-project-notes",
        license: repo.license,
        licenseNote: "Litsenziya ruxsatli ro‘yxatda; matn faqat til andozalari uchun, fakt sifatida tasdiqlanmagan.",
        factualUseAllowed: false,
        trainingScope: "unreviewed-language-patterns-only",
        createdAt: generatedAt,
        sourceSnapshotAt: generatedAt
      };
    })
    .filter(Boolean);
}

module.exports = { ALLOWED_LICENSES, trimWords, buildKnowledgeEntries };
