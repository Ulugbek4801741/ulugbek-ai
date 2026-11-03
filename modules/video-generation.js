"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const MAX_PROMPT_LENGTH = 1000;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function endpointFrom(env = process.env) {
  const raw = String(env.VIDEO_COMFYUI_URL || "").trim();
  if (!raw) return null;
  let url;
  try { url = new URL(raw); } catch (_) { throw new Error("VIDEO_COMFYUI_URL noto‘g‘ri manzil."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("Video modeli manzili HTTP/HTTPS bo‘lishi kerak; login ma’lumotlarini alohida sozlang.");
  }
  return url.toString().replace(/\/$/, "");
}
function validatePrompt(value) {
  const prompt = typeof value === "string" ? value.trim() : "";
  if (!prompt) { const error = new Error("Video tavsifi bo‘sh."); error.status = 400; throw error; }
  if (prompt.length > MAX_PROMPT_LENGTH) { const error = new Error("Video tavsifi 1000 belgidan oshmasin."); error.status = 413; throw error; }
  return prompt;
}
function replacePlaceholders(value, prompt, negativePrompt, seed) {
  if (Array.isArray(value)) return value.map(item => replacePlaceholders(item, prompt, negativePrompt, seed));
  if (value && typeof value === "object") {
    const output = {};
    for (const [key, item] of Object.entries(value)) output[key] = replacePlaceholders(item, prompt, negativePrompt, seed);
    return output;
  }
  if (typeof value !== "string") return value;
  return value
    .replaceAll("{{PROMPT}}", prompt)
    .replaceAll("{{NEGATIVE_PROMPT}}", negativePrompt)
    .replaceAll("{{SEED}}", String(seed));
}
function findVideoOutput(history) {
  const outputs = history?.outputs || {};
  for (const node of Object.values(outputs)) {
    for (const key of ["videos", "gifs", "files"]) {
      const entries = Array.isArray(node?.[key]) ? node[key] : [];
      for (const item of entries) {
        const filename = typeof item?.filename === "string" ? item.filename : "";
        if (/\.(mp4|webm|mov|mkv)$/i.test(filename)) {
          return { filename, subfolder: typeof item.subfolder === "string" ? item.subfolder : "", type: typeof item.type === "string" ? item.type : "output" };
        }
      }
    }
  }
  return null;
}
function createVideoGenerator({ env = process.env, fetchImpl = globalThis.fetch, sleepImpl = sleep } = {}) {
  async function call(url, options = {}) {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (env.VIDEO_COMFYUI_USERNAME || env.VIDEO_COMFYUI_PASSWORD) {
      headers.Authorization = "Basic " + Buffer.from(String(env.VIDEO_COMFYUI_USERNAME || "") + ":" + String(env.VIDEO_COMFYUI_PASSWORD || "")).toString("base64");
    }
    const response = await fetchImpl(url, { ...options, headers, redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      const error = new Error("Video modeli HTTP " + response.status + " javob qaytardi.");
      error.status = 502;
      throw error;
    }
    return response;
  }
  async function loadWorkflow() {
    const rawPath = String(env.VIDEO_COMFYUI_WORKFLOW || "").trim();
    if (!rawPath) { const error = new Error("Video workflow fayli serverda sozlanmagan."); error.status = 503; throw error; }
    const workflowPath = path.resolve(rawPath);
    const stat = await fs.stat(workflowPath).catch(() => null);
    if (!stat?.isFile() || stat.size > 5 * 1024 * 1024) {
      const error = new Error("Video workflow fayli topilmadi yoki 5 MB dan katta."); error.status = 503; throw error;
    }
    let workflow;
    try { workflow = JSON.parse(await fs.readFile(workflowPath, "utf8")); }
    catch (_) { const error = new Error("Video workflow JSON fayli noto‘g‘ri."); error.status = 503; throw error; }
    if (!workflow || Array.isArray(workflow) || typeof workflow !== "object" || !Object.keys(workflow).length) {
      const error = new Error("Video workflow bo‘sh yoki noto‘g‘ri formatda."); error.status = 503; throw error;
    }
    return workflow;
  }
  return {
    status() {
      let endpoint = null;
      try { endpoint = endpointFrom(env); } catch (_) {}
      return {
        enabled: Boolean(endpoint && env.VIDEO_COMFYUI_WORKFLOW),
        provider: endpoint ? "self-hosted-comfyui" : null,
        workflowConfigured: Boolean(env.VIDEO_COMFYUI_WORKFLOW),
        requiresApiKey: false,
        model: "administrator-selected-ComfyUI-workflow"
      };
    },
    async generate(value) {
      const promptText = validatePrompt(value);
      const endpoint = endpointFrom(env);
      if (!endpoint) { const error = new Error("Video modeli serverda ulanmagan. VIDEO_COMFYUI_URL sozlang."); error.status = 503; throw error; }
      const workflow = await loadWorkflow();
      const prompt = replacePlaceholders(workflow, promptText, "low quality, blurry, flicker, watermark, distorted", crypto.randomInt(1, 2147483647));
      const promptNodeId = String(env.VIDEO_PROMPT_NODE_ID || "").trim();
      if (promptNodeId) {
        const node = prompt[promptNodeId];
        if (!node || !node.inputs || typeof node.inputs !== "object") {
          const error = new Error("VIDEO_PROMPT_NODE_ID workflow ichida topilmadi yoki inputs yo‘q."); error.status = 503; throw error;
        }
        node.inputs[String(env.VIDEO_PROMPT_INPUT || "text")] = promptText;
      }
      const queuedResponse = await call(endpoint + "/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, client_id: crypto.randomUUID() })
      });
      const queued = await queuedResponse.json();
      const promptId = typeof queued.prompt_id === "string" ? queued.prompt_id : "";
      if (!promptId) { const error = new Error("ComfyUI vazifani navbatga qo‘sha olmadi: " + String(queued.error?.message || "prompt_id yo‘q")); error.status = 502; throw error; }
      const deadline = Date.now() + 180000;
      let output = null;
      while (Date.now() < deadline) {
        await sleepImpl(2000);
        const historyResponse = await call(endpoint + "/history/" + encodeURIComponent(promptId));
        const historyData = await historyResponse.json();
        const entry = historyData[promptId];
        if (entry?.status?.status_str === "error" || entry?.status?.completed === false && entry?.status?.messages?.some?.(message => message?.[0] === "execution_error")) {
          const error = new Error("Video modeli vazifani bajara olmadi."); error.status = 502; throw error;
        }
        if (entry) {
          output = findVideoOutput(entry);
          if (output) break;
        }
      }
      if (!output) { const error = new Error("Video yaratish 3 daqiqada tugamadi yoki workflow video fayl chiqarmadi."); error.status = 504; throw error; }
      const view = new URL(endpoint + "/view");
      view.searchParams.set("filename", output.filename);
      view.searchParams.set("subfolder", output.subfolder);
      view.searchParams.set("type", output.type);
      const videoResponse = await call(view.toString(), { headers: { Accept: "video/mp4,video/webm,video/*,application/octet-stream" } });
      const declared = Number(videoResponse.headers?.get?.("content-length") || 0);
      if (declared > MAX_VIDEO_BYTES) { const error = new Error("Yaratilgan video 20 MB dan katta."); error.status = 413; throw error; }
      const bytes = await videoResponse.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > MAX_VIDEO_BYTES) { const error = new Error("Video bo‘sh yoki 20 MB dan katta."); error.status = 413; throw error; }
      const buffer = Buffer.from(bytes);
      const isMp4 = buffer.length > 12 && buffer.toString("ascii", 4, 8) === "ftyp";
      const isWebm = buffer.length > 4 && buffer.subarray(0, 4).toString("hex") === "1a45dfa3";
      if (!isMp4 && !isWebm) { const error = new Error("ComfyUI chiqargan fayl MP4 yoki WebM video emas."); error.status = 415; throw error; }
      return {
        video: buffer.toString("base64"),
        mimeType: isMp4 ? "video/mp4" : "video/webm",
        prompt: promptText,
        filename: "ulugbek-ai-video." + (isMp4 ? "mp4" : "webm"),
        promptId
      };
    }
  };
}
module.exports = { createVideoGenerator, endpointFrom, validatePrompt, replacePlaceholders, findVideoOutput };
