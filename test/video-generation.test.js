"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createVideoGenerator, endpointFrom, validatePrompt, replacePlaceholders, findVideoOutput } = require("../modules/video-generation");

function response({ ok = true, status = 200, json, bytes, headers = {} } = {}) {
  return {
    ok, status,
    headers: { get(name) { return headers[name.toLowerCase()] || null; } },
    async json() { return json; },
    async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }
  };
}
async function tempWorkflow(value) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-video-test-"));
  const file = path.join(dir, "workflow.json");
  await fs.writeFile(file, JSON.stringify(value));
  return { dir, file };
}

test("video endpoint must be a valid HTTP(S) URL without embedded credentials", () => {
  assert.equal(endpointFrom({ VIDEO_COMFYUI_URL: "http://127.0.0.1:8188" }), "http://127.0.0.1:8188");
  assert.equal(endpointFrom({}), null);
  assert.throws(() => endpointFrom({ VIDEO_COMFYUI_URL: "file:///tmp/model" }));
  assert.throws(() => endpointFrom({ VIDEO_COMFYUI_URL: "https://user:pass@example.com" }));
});

test("video prompts are bounded and workflow placeholders are replaced recursively", () => {
  assert.equal(validatePrompt("  A small robot walking  "), "A small robot walking");
  assert.throws(() => validatePrompt(" "));
  assert.throws(() => validatePrompt("x".repeat(1001)), error => error.status === 413);
  const result = replacePlaceholders({ "1": { inputs: { text: "{{PROMPT}}", seed: "{{SEED}}", negative: "{{NEGATIVE_PROMPT}}" } } }, "robot", "blur", 123);
  assert.equal(result["1"].inputs.text, "robot");
  assert.equal(result["1"].inputs.seed, "123");
  assert.equal(result["1"].inputs.negative, "blur");
});

test("finds video output but ignores still images", () => {
  assert.equal(findVideoOutput({ outputs: { "1": { images: [{ filename: "still.png" }] } } }), null);
  assert.deepEqual(findVideoOutput({ outputs: { "2": { gifs: [{ filename: "clip.mp4", subfolder: "video", type: "output" }] } } }), {
    filename: "clip.mp4", subfolder: "video", type: "output"
  });
});

test("reports unavailable until both ComfyUI endpoint and workflow are configured", () => {
  const generator = createVideoGenerator({ env: {} });
  assert.equal(generator.status().enabled, false);
  assert.equal(generator.status().requiresApiKey, false);
});

test("queues ComfyUI workflow, waits for MP4 and returns video bytes", async () => {
  const workflow = await tempWorkflow({ "10": { class_type: "TextEncode", inputs: { text: "{{PROMPT}}" } } });
  const mp4 = Buffer.alloc(32);
  mp4.write("ftyp", 4, "ascii");
  const calls = [];
  const generator = createVideoGenerator({
    env: {
      VIDEO_COMFYUI_URL: "http://127.0.0.1:8188",
      VIDEO_COMFYUI_WORKFLOW: workflow.file,
      VIDEO_PROMPT_NODE_ID: "10",
      VIDEO_PROMPT_INPUT: "text"
    },
    sleepImpl: async () => {},
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith("/prompt")) {
        const body = JSON.parse(options.body);
        assert.equal(body.prompt["10"].inputs.text, "a fox running in a field");
        return response({ json: { prompt_id: "test-prompt-1" } });
      }
      if (String(url).includes("/history/")) {
        const history = {
          "test-prompt-1": {
            status: { status_str: "success", completed: true },
            outputs: { "20": { videos: [{ filename: "result.mp4", subfolder: "", type: "output" }] } }
          }
        };
        return response({ json: history });
      }
      if (String(url).includes("/view?")) return response({ bytes: mp4 });
      throw new Error("Unexpected URL " + url);
    }
  });
  try {
    const result = await generator.generate("a fox running in a field");
    assert.equal(result.mimeType, "video/mp4");
    assert.equal(result.promptId, "test-prompt-1");
    assert.equal(Buffer.from(result.video, "base64").toString("hex"), mp4.toString("hex"));
    assert.equal(calls.length, 3);
  } finally {
    await fs.rm(workflow.dir, { recursive: true, force: true });
  }
});

test("rejects ComfyUI HTML or image response as a video", async () => {
  const workflow = await tempWorkflow({ "10": { inputs: { text: "{{PROMPT}}" } } });
  const generator = createVideoGenerator({
    env: { VIDEO_COMFYUI_URL: "http://127.0.0.1:8188", VIDEO_COMFYUI_WORKFLOW: workflow.file },
    sleepImpl: async () => {},
    fetchImpl: async url => {
      if (String(url).endsWith("/prompt")) return response({ json: { prompt_id: "p" } });
      if (String(url).includes("/history/")) {
        return response({ json: { p: { outputs: { "1": { videos: [{ filename: "fake.mp4" }] } } } } });
      }
      return response({ bytes: Buffer.from("<html>not a video</html>") });
    }
  });
  try {
    await assert.rejects(generator.generate("a river"), error => error.status === 415);
  } finally {
    await fs.rm(workflow.dir, { recursive: true, force: true });
  }
});
