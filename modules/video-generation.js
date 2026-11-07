"use strict";

const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const MAX_PROMPT_LENGTH = 1000;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const GENERATION_TIMEOUT_MS = 15 * 60 * 1000;

function validatePrompt(value) {
  const prompt = typeof value === "string" ? value.trim() : "";
  if (!prompt) {
    const error = new Error("Video tavsifi bo‘sh.");
    error.status = 400;
    throw error;
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    const error = new Error("Video tavsifi 1000 belgidan oshmasin.");
    error.status = 413;
    throw error;
  }
  return prompt;
}

function createVideoGenerator({
  env = process.env,
  spawnImpl = spawn,
  scriptPath = path.join(__dirname, "..", "video-ai", "generate.py"),
  tempDir = os.tmpdir()
} = {}) {
  let running = false;
  const checkpointPath = () => path.resolve(String(env.VIDEO_AI_CHECKPOINT || path.join(__dirname, "..", "video-ai", "checkpoints", "native-video.pt")));
  const pythonPath = () => String(env.VIDEO_AI_PYTHON || "python3").trim() || "python3";

  function status() {
    const checkpoint = checkpointPath();
    const checkpointReady = fsSync.existsSync(checkpoint) && fsSync.statSync(checkpoint).isFile();
    const scriptReady = fsSync.existsSync(scriptPath);
    return {
      enabled: checkpointReady && scriptReady,
      provider: "ulugbek-native-video-model",
      model: "native-text-conditioned-3d-gan",
      trainedFromScratch: true,
      requiresApiKey: false,
      requiresExternalVideoService: false,
      checkpointReady,
      scriptReady,
      checkpointPath: checkpointReady ? checkpoint : null,
      running,
      target: { width: 64, height: 64, frames: 16, fps: 8 },
      note: checkpointReady
        ? "ULUGBEK AI ichida o‘qitilgan video modeli mavjud."
        : "Mustaqil video modeli hali o‘qitilmagan. Avval video-ai/train.py orqali checkpoint yarating."
    };
  }

  async function generate(value) {
    const prompt = validatePrompt(value);
    const current = status();
    if (!current.enabled) {
      const error = new Error("ULUGBEK AI video modeli hali o‘qitilmagan. Avval ruxsatli video ma’lumotlari bilan modelni o‘qitish kerak.");
      error.status = 503;
      throw error;
    }
    if (running) {
      const error = new Error("Video modeli hozir boshqa videoni yaratyapti. Navbat tugashini kuting.");
      error.status = 429;
      throw error;
    }

    running = true;
    const outputPath = path.join(tempDir, "ulugbek-video-" + crypto.randomUUID() + ".mp4");
    try {
      await new Promise((resolve, reject) => {
        const args = [
          scriptPath,
          "--checkpoint", checkpointPath(),
          "--prompt", prompt,
          "--output", outputPath
        ];
        let child;
        try {
          child = spawnImpl(pythonPath(), args, {
            cwd: path.dirname(scriptPath),
            env: { ...process.env, ...env },
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true
          });
        } catch (error) {
          const wrapped = new Error("Mustaqil video modelini ishga tushirib bo‘lmadi: " + String(error.message || error).slice(0, 160));
          wrapped.status = 503;
          reject(wrapped);
          return;
        }
        let stderr = "";
        let settled = false;
        const finish = (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (error) reject(error);
          else resolve();
        };
        child.stderr?.on("data", chunk => { stderr = (stderr + chunk.toString()).slice(-4000); });
        child.on("error", error => {
          const wrapped = new Error("Python video muhiti ishga tushmadi: " + String(error.message || error).slice(0, 160));
          wrapped.status = 503;
          finish(wrapped);
        });
        child.on("close", code => {
          if (code === 0) return finish();
          const wrapped = new Error("Mustaqil video modeli xato bilan tugadi." + (stderr ? " " + stderr.slice(-700) : ""));
          wrapped.status = 502;
          finish(wrapped);
        });
        const timer = setTimeout(() => {
          child.kill?.("SIGTERM");
          const timeout = new Error("Video yaratish 15 daqiqada tugamadi.");
          timeout.status = 504;
          finish(timeout);
        }, GENERATION_TIMEOUT_MS);
        timer.unref?.();
      });

      const stat = await fs.stat(outputPath);
      if (!stat.isFile() || stat.size < 256 || stat.size > MAX_VIDEO_BYTES) {
        const error = new Error("Video fayli bo‘sh yoki 20 MB dan katta.");
        error.status = 413;
        throw error;
      }
      const buffer = await fs.readFile(outputPath);
      const isMp4 = buffer.length > 12 && buffer.toString("ascii", 4, 8) === "ftyp";
      if (!isMp4) {
        const error = new Error("Model yaroqli MP4 video chiqarmadi.");
        error.status = 415;
        throw error;
      }
      return {
        video: buffer.toString("base64"),
        mimeType: "video/mp4",
        filename: "ulugbek-ai-video.mp4",
        prompt,
        model: "ulugbek-native-video-model"
      };
    } finally {
      running = false;
      await fs.rm(outputPath, { force: true }).catch(() => {});
    }
  }

  return { status, generate };
}

module.exports = { createVideoGenerator, validatePrompt, MAX_VIDEO_BYTES, GENERATION_TIMEOUT_MS };
