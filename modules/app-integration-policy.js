"use strict";

// Safe integration directory: this lists official store entry points only.
// It does not download, install, launch, or grant permissions to third-party apps.
const STORES = Object.freeze([
  {
    id: "google-play",
    name: "Google Play",
    platform: "android",
    url: "https://play.google.com/store",
    installMode: "user-confirmed-store",
    note: "Android ilovalarini rasmiy do‘kondan foydalanuvchi o‘zi tanlaydi va o‘rnatadi."
  },
  {
    id: "microsoft-store",
    name: "Microsoft Store",
    platform: "windows",
    url: "https://apps.microsoft.com/",
    installMode: "windows-device-required",
    note: "Windows ilovalari Windows qurilmasida ishlaydi; Androidda to‘g‘ridan-to‘g‘ri o‘rnatilmaydi."
  },
  {
    id: "apple-app-store",
    name: "Apple App Store",
    platform: "ios",
    url: "https://www.apple.com/app-store/",
    installMode: "apple-device-required",
    note: "iPhone/iPad ilovalari mos Apple qurilmasi va Apple qoidalarini talab qiladi."
  }
]);

function getIntegrationCatalog() {
  return {
    ok: true,
    items: STORES.map((item) => ({ ...item })),
    policy: {
      automaticDownloads: false,
      automaticInstalls: false,
      automaticPermissionGrants: false,
      voiceCommandsRequireConfirmation: true,
      onlyOfficialStoreLinks: true
    },
    note: "Bu katalog rasmiy do‘konlarni ochadi, 14 000 ta ilovani avtomatik yuklab olmaydi. Har bir ilova mos qurilmada, litsenziya va foydalanuvchi tasdig‘i bilan o‘rnatiladi."
  };
}

function validateIntegrationAction(action) {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    return { allowed: false, reason: "invalid_action" };
  }
  if (action.type !== "open_store") {
    return { allowed: false, reason: "unsupported_action" };
  }
  const store = STORES.find((item) => item.id === action.storeId);
  if (!store) return { allowed: false, reason: "unknown_store" };
  if (action.confirmed !== true) {
    return { allowed: false, reason: "user_confirmation_required" };
  }
  return { allowed: true, store: { ...store } };
}

module.exports = { getIntegrationCatalog, validateIntegrationAction };
