# ULUGBEK AI for Windows

This Electron desktop shell opens the hosted ULUGBEK AI web app. It is not a fully offline desktop backend and does not bundle the Express API.

## Build locally

Requires Node.js 20 or newer and a Windows/macOS/Linux development environment.

```bash
npm install
npm run desktop
```

By default the app opens the GitHub Pages site. Set `ULUGBEK_WEB_URL` to a trusted HTTPS deployment URL to use another deployment. Only navigation on that same origin is allowed inside the app; HTTPS links to other sites open in the system browser.

## Installer

GitHub Actions builds a Windows NSIS installer and uploads it as the `ulugbek-ai-windows-installer` artifact. The installer is an unsigned development build; Windows SmartScreen may show a warning until the application is properly code-signed.

The app requires an internet connection for the hosted website. Backend API, login, and AI features only work when the web deployment is correctly configured.
