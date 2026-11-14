"use strict";
// Privacy-first default: no remote API until the device owner explicitly opts in.
const DEFAULT_REMOTE_API = "https://ulugbek-ai-1.onrender.com";
const CONSENT_KEY = "ulugbek-remote-data-consent-v1";
const host = window.location.hostname.toLowerCase();
const isGitHubPages = host === "github.io" || host.endsWith(".github.io");
const isNativeLocalhost = host === "localhost" || host === "127.0.0.1";
function hasRemoteConsent() {
  try { return localStorage.getItem(CONSENT_KEY) === "granted"; }
  catch (_) { return false; }
}
function resolveRemoteApi() {
  return (isGitHubPages || isNativeLocalhost) ? DEFAULT_REMOTE_API : window.location.origin;
}
window.ULUGBEK_REMOTE_DATA_CONSENT = hasRemoteConsent();
window.ULUGBEK_API_BASE_URL = window.ULUGBEK_REMOTE_DATA_CONSENT ? resolveRemoteApi() : "";
window.ULUGBEK_SET_REMOTE_DATA_CONSENT = function (enabled) {
  try {
    if (enabled === true) {
      localStorage.setItem(CONSENT_KEY, "granted");
      window.ULUGBEK_REMOTE_DATA_CONSENT = true;
      window.ULUGBEK_API_BASE_URL = resolveRemoteApi();
      return true;
    }
    localStorage.removeItem(CONSENT_KEY);
  } catch (_) {
    window.ULUGBEK_REMOTE_DATA_CONSENT = false;
    window.ULUGBEK_API_BASE_URL = "";
    return false;
  }
  window.ULUGBEK_REMOTE_DATA_CONSENT = false;
  window.ULUGBEK_API_BASE_URL = "";
  return true;
};
