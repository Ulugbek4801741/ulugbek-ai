"use strict";
// Render serves frontend and API from one origin. GitHub Pages is static-only,
// so its chat API must target the separate Render backend.
const host = window.location.hostname.toLowerCase();
const isGitHubPages = host === "github.io" || host.endsWith(".github.io");
window.ULUGBEK_API_BASE_URL = isGitHubPages
  ? "https://ulugbek-ai2.onrender.com"
  : window.location.origin;
