"use strict";
// Render serves frontend and API from one origin. GitHub Pages is static-only,
// so its chat API must target the active Render backend.
// Capacitor's Android WebView also uses localhost and must call the backend.
const host = window.location.hostname.toLowerCase();
const isGitHubPages = host === "github.io" || host.endsWith(".github.io");
const isNativeLocalhost = host === "localhost" || host === "127.0.0.1";
window.ULUGBEK_API_BASE_URL = (isGitHubPages || isNativeLocalhost)
  ? "https://ulugbek-ai-1.onrender.com"
  : window.location.origin;
