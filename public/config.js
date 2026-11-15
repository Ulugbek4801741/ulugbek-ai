"use strict";
// Render serves the frontend and API from one origin. Static GitHub Pages
// and Capacitor's local WebView must call the active ULUGBEK AI backend.
const host = window.location.hostname.toLowerCase();
const isGitHubPages = host === "github.io" || host.endsWith(".github.io");
const isNativeLocalhost = host === "localhost" || host === "127.0.0.1";
window.ULUGBEK_API_BASE_URL = (isGitHubPages || isNativeLocalhost)
  ? "https://ulugbek-ai2.onrender.com"
  : window.location.origin;
