"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { createVideoGenerator, validatePrompt } = require("../modules/video-generation");

test("native video prompts are validated and bounded", () => {
  assert.equal(validatePrompt("  Tog‘lar ustidan uchayotgan kamera  "), "Tog‘lar ustidan uchayotgan kamera");
  assert.throws(() => validatePrompt("  "), error => error.status === 400);
  assert.throws(() => validatePrompt("x".repeat(1001)), error => error.status === 413);
});

test("native engine never requires a remote URL, API key, or ComfyUI workflow", () => {
  const generator = createVideoGenerator({ env: {} });
  const state = generator.status();
  assert.equal(state.provider, "ulugbek-native-video-model");
  assert.equal(state.requiresApiKey, false);
  assert.equal(state.requiresExternalVideoService, false);
  assert.equal(state.trainedFromScratch, true);
  assert.equal(state.enabled, false);
  assert.match(state.note, /hali o‘qitilmagan/);
});

test("native engine invokes its own Python checkpoint and returns a real MP4", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-native-video-"));
  const checkpoint = path.join(dir, "model.pt");
  const script = path.join(dir, "generate.py");
  await fs.writeFile(checkpoint, "test checkpoint");
  await fs.writeFile(script, "# test script");
  const mp4 = Buffer.alloc(300);
  mp4.write("ftyp", 4, "ascii");
  let called = false;
  const generator = createVideoGenerator({
    env: { VIDEO_AI_CHECKPOINT: checkpoint, VIDEO_AI_PYTHON: "python3" },
    scriptPath: script,
    tempDir: dir,
    spawnImpl: (_command, args) => {
      called = true;
      assert.ok(args.includes("--checkpoint"));
      assert.equal(args[args.indexOf("--checkpoint") + 1], checkpoint);
      assert.equal(args[args.indexOf("--prompt") + 1], "A bird flying over a lake");
      const child = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = () => {};
      setImmediate(async () => {
        await fs.writeFile(args[args.indexOf("--output") + 1], mp4);
        child.emit("close", 0);
      });
      return child;
    }
  });
  try {
    assert.equal(generator.status().enabled, true);
    const result = await generator.generate("A bird flying over a lake");
    assert.equal(called, true);
    assert.equal(result.mimeType, "video/mp4");
    assert.equal(Buffer.from(result.video, "base64").length, 300);
    assert.equal(result.model, "ulugbek-native-video-model");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
