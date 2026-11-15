"use strict";
// Render serves frontend and API from one origin. GitHub Pages is static-only,
// so its chat API must target the active ULUGBEK AI backend.
// Capacitor's Android WebView also uses localhost and must call that backend.
const host = window.location.hostname.toLowerCase();
const isGitHubPages = host === "github.io" || host.endsWith(".github.io");
const isNativeLocalhost = host === "localhost" || host === "127.0.0.1";
window.ULUGBEK_API_BASE_URL = (isGitHubPages || isNativeLocalhost)
  ? "https://ulugbek-ai1.onrender.com"
  : window.location.origin;
