# Universal device compatibility

## Goal
The compatibility layer selects a user-interface profile from capabilities that the browser actually exposes. It does not emulate missing CPU, RAM, modem, microphone, GPU, TLS, or operating-system features.

## Profiles
- **Full:** modern browser APIs and responsive interface.
- **Lite:** low-memory / low-core / data-saver devices; keep the interface simple and avoid motion-heavy presentation.
- **Legacy:** browsers without Fetch or Promise are routed to `compat-legacy.html`, an ES5-style text-only page that sends chat requests with XMLHttpRequest.
- **Unsupported:** no usable DOM or network transport; show an explanation rather than pretending the device can run the app.

## Fallbacks
- Fetch -> XMLHttpRequest.
- Speech input/output -> text-only chat when browser speech APIs are missing.
- Local storage -> memory-only session when storage is blocked.
- Full UI -> low-motion or text-only UI.

## Important limits
1. A very old browser may not support modern HTTPS/TLS certificates or current certificate authorities. A website cannot repair this from JavaScript. Use an updated browser, a compatible local gateway, or a newer device.
2. Windows 95/98 may not connect to modern HTTPS services at all. The legacy page is a best-effort interface, not a guarantee of connectivity on every 1990s computer.
3. Android 4.1 and old iPhones must be tested on real devices. Browser version, TLS support, memory, and vendor changes matter more than the OS label alone.
4. The old-browser page still needs a reachable backend for AI replies. Offline mode can show the shell and locally saved content only; it cannot invent model answers.
5. This layer does not make a modern Android/iOS native app compatible with unsupported operating systems. Native builds require separate minimum-OS targets.

## Test
Run `npm test`. The compatibility detector has isolated tests for modern, low-resource, legacy, unsupported, and blocked-storage environments.
