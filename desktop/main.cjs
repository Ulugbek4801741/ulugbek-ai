"use strict";

const { app, BrowserWindow, shell } = require("electron");

const DEFAULT_WEB_URL = "https://ulugbek4801741.github.io/ulugbek-ai-web/";
const APP_URL = process.env.ULUGBEK_WEB_URL || DEFAULT_WEB_URL;

if (!/^https:\/\//i.test(APP_URL)) {
  throw new Error("ULUGBEK_WEB_URL must use HTTPS.");
}

function isAllowedAppUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const appUrl = new URL(APP_URL);
    return url.protocol === "https:" && url.origin === appUrl.origin;
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    title: "ULUGBEK AI",
    autoHideMenuBar: true,
    webPreferences: {
      preload: require("node:path").join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedAppUrl(url)) event.preventDefault();
  });

  win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
