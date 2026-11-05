"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

test("error learning classifies the supplied ULUGBEK AI failure categories", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-error-learning-"));
  const previous = process.env.ULUGBEK_DATA_DIR;
  process.env.ULUGBEK_DATA_DIR = dir;
  try {
    const file = require.resolve("../modules/error-learning");
    delete require.cache[file];
    const learning = require("../modules/error-learning");
    assert.equal(learning.inferIntent("Ushbu g‘oyani bosqichma-bosqich rejalashtir"), "planning");
    assert.equal(learning.inferIntent("Rayhon SI moduli ai yaratamiz"), "creation");
    assert.equal(learning.inferIntent("Ish topib ber"), "job-search");
    assert.equal(learning.inferIntent("Kogon"), "location-context");
    assert.equal(learning.inferIntent("Dasturlashda yordam ber"), "programming");
    await learning.recordFailure({
      prompt: "Kogon",
      response: "Bu savolga hozircha tasdiqlangan bilimlar bazamdan ishonchli javob topa olmadim."
    });
    const state = await learning.status();
    assert.equal(state.failureCount, 1);
    assert.equal(state.pendingReview, 0);
    const submitted = await learning.submitFeedback({
      prompt: "Rayhon SI moduli ai yaratamiz",
      correction: "Bu yangi AI modulini yaratish talabi; avval talablarni aniqlab, arxitektura va bosqichlarni taklif qil.",
      rating: "negative"
    });
    assert.equal(submitted.reviewStatus, "pending-review");
    assert.equal((await learning.status()).pendingReview, 1);
    const candidates = await learning.listCandidates();
    assert.equal(candidates.feedback.length, 1);
    assert.equal(await learning.reviewFeedback(submitted.id, "approved"), true);
    assert.equal((await learning.status()).approvedCorrections, 1);
  } finally {
    if (previous === undefined) delete process.env.ULUGBEK_DATA_DIR;
    else process.env.ULUGBEK_DATA_DIR = previous;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
