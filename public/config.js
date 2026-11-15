"use strict";
// Render serves the frontend and API from one origin. GitHub Pages is static-only,
// so its chat API must target the active ULUGBEK backend service.
// Capacitor's Android WebView also uses the backend when opened on localhost.
const host = window.location.hostname.toLowerCase();
const isGitHubPages = host === "github.io" || host.endsWith(".github.io");
const isNativeLocalhost = host === "localhost" || host === "127.0.0.1";
const backendOrigin = "https://ulugbek-ai2.onrender.com";
window.ULUGBEK_API_BASE_URL = (isGitHubPages || isNativeLocalhost)
  ? backendOrigin
  : window.location.origin;
