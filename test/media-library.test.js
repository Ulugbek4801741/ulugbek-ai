"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  createMediaLibrary,
  licenseAllowed,
  safeMediaUrl,
  identifyMedia,
  safeCommons
} = require("../modules/media-library");

function pngBytes() {
  return Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
}
function mockResponse({ ok = true, status = 200, json, bytes, contentLength } = {}) {
  return {
    ok, status,
    headers: { get(name) { return name.toLowerCase() === "content-length" ? (contentLength || null) : null; } },
    async json() { return json; },
    async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }
  };
}

test("accepts only reusable open licenses", () => {
  assert.equal(licenseAllowed("cc0"), true);
  assert.equal(licenseAllowed("by"), true);
  assert.equal(licenseAllowed("by-sa"), true);
  assert.equal(licenseAllowed("pdm"), true);
  assert.equal(licenseAllowed("by-nc"), false);
  assert.equal(licenseAllowed("all-rights-reserved"), false);
});

test("download URLs must use HTTPS and an approved media host", () => {
  assert.equal(safeMediaUrl("https://images.unsplash.com/photo.jpg").hostname, "images.unsplash.com");
  assert.equal(safeMediaUrl("http://images.unsplash.com/photo.jpg"), null);
  assert.equal(safeMediaUrl("https://localhost/private.png"), null);
  assert.equal(safeMediaUrl("https://example.com/image.png"), null);
  assert.equal(safeMediaUrl("https://user:pass@images.unsplash.com/a.jpg"), null);
});

test("detects supported file signatures, not file-name claims", () => {
  assert.equal(identifyMedia(pngBytes()).mimeType, "image/png");
  assert.equal(identifyMedia(Buffer.from([0xff, 0xd8, 0xff, 0x00])).kind, "image");
  assert.equal(identifyMedia(Buffer.from("1a45dfa3", "hex")).kind, "video");
  assert.equal(identifyMedia(Buffer.from("<html>")).kind, undefined);
});

test("Wikimedia results with noncommercial or unknown licenses are excluded", () => {
  const page = {
    pageid: 7,
    title: "File:sample.jpg",
    imageinfo: [{
      url: "https://upload.wikimedia.org/wikipedia/commons/sample.jpg",
      extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" }, Artist: { value: "A Photographer" } }
    }]
  };
  const result = safeCommons(page);
  assert.equal(result.license, "by-sa");
  assert.equal(result.kind, "image");
  page.imageinfo[0].extmetadata.LicenseShortName.value = "CC BY-NC 4.0";
  assert.equal(safeCommons(page), null);
});

test("search returns only approved results and hides direct download URLs", async () => {
  const library = createMediaLibrary({
    dataDir: path.join(os.tmpdir(), "ulugbek-media-search-test-" + Date.now()),
    fetchImpl: async () => mockResponse({ json: { results: [
      { id: "good", title: "Open photo", creator: "Author", license: "by", license_version: "4.0", url: "https://images.unsplash.com/photo.jpg", foreign_landing_url: "https://example.org/source" },
      { id: "bad", title: "Restricted photo", license: "by-nc", url: "https://images.unsplash.com/restricted.jpg" },
      { id: "unsafe", title: "Unsafe host", license: "cc0", url: "https://example.com/image.jpg" }
    ] } })
  });
  const result = await library.search("mountain", { kind: "image" });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].id, "ov-good");
  assert.equal("mediaUrl" in result.results[0], false);
  await assert.rejects(library.importAsset({ id: "ov-forged" }), error => error.status === 400);
});

test("imports only a recently searched result, stores attribution and prevents duplicates", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-media-import-"));
  let mediaDownloads = 0;
  const library = createMediaLibrary({
    dataDir,
    fetchImpl: async url => {
      if (String(url).startsWith("https://api.openverse.org/")) {
        return mockResponse({ json: { results: [
          { id: "photo-1", title: "Mountain", creator: "Artist", license: "cc0", license_version: "", url: "https://images.unsplash.com/photo.jpg", foreign_landing_url: "https://openverse.org/image/photo-1" }
        ] } });
      }
      mediaDownloads++;
      return mockResponse({ bytes: pngBytes(), contentLength: String(pngBytes().length) });
    }
  });
  try {
    await library.search("mountain", { kind: "image" });
    const first = await library.importAsset({ id: "ov-photo-1" });
    const second = await library.importAsset({ id: "ov-photo-1" });
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(first.item.license, "cc0");
    assert.equal(first.item.creator, "Artist");
    assert.equal(first.item.trainingStatus, "not-approved");
    assert.equal(mediaDownloads, 1);
    const files = await fs.readdir(path.join(dataDir, "assets"));
    assert.equal(files.length, 1);
    const status = await library.status();
    assert.equal(status.images, 1);
    assert.equal(status.automaticTraining, false);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test("rejects unsupported or oversized media", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-media-bad-"));
  const library = createMediaLibrary({
    dataDir,
    fetchImpl: async url => String(url).startsWith("https://api.openverse.org/")
      ? mockResponse({ json: { results: [{ id: "x", license: "cc0", url: "https://images.unsplash.com/x.jpg" }] } })
      : mockResponse({ bytes: Buffer.from("<script>alert(1)</script>") })
  });
  try {
    await library.search("test", { kind: "image" });
    await assert.rejects(library.importAsset({ id: "ov-x" }), error => error.status === 415);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
