(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    var result = api.detect(root);
    root.ULUGBEK_COMPAT = result;
    if (root.document && result.profile === "legacy" && !/compat-legacy\.html$/.test(root.location.pathname)) {
      root.location.replace("compat-legacy.html");
    }
    if (root.document && result.profile === "lite") {
      root.document.documentElement.className += " ulugbek-lite";
      var style = root.document.createElement("style");
      style.type = "text/css";
      style.appendChild(root.document.createTextNode("*{animation:none!important;transition:none!important;scroll-behavior:auto!important}")); 
      (root.document.head || root.document.documentElement).appendChild(style);
    }
  }
}(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  function detect(env) {
    env = env || {};
    var nav = env.navigator || {};
    var doc = env.document || {};
    var hasFetch = typeof env.fetch === "function";
    var hasPromise = typeof env.Promise === "function";
    var hasXHR = typeof env.XMLHttpRequest === "function";
    var hasDOM = !!(doc.createElement && doc.getElementById);
    var memory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
    var cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null;
    var saveData = !!(nav.connection && nav.connection.saveData);
    var lowPower = saveData || (memory !== null && memory <= 2) || (cores !== null && cores <= 2);
    var profile = (!hasDOM || (!hasXHR && !hasFetch)) ? "unsupported" :
      ((!hasFetch || !hasPromise) ? "legacy" : (lowPower ? "lite" : "full"));
    return {
      profile: profile,
      capabilities: {
        dom: hasDOM,
        fetch: hasFetch,
        promises: hasPromise,
        xhr: hasXHR,
        localStorage: !!(function(){ try { return env.localStorage; } catch (_) { return null; } }()),
        speechRecognition: !!(env.SpeechRecognition || env.webkitSpeechRecognition),
        speechSynthesis: !!env.speechSynthesis,
        serviceWorker: !!(nav.serviceWorker),
        deviceMemoryGB: memory,
        cpuCores: cores,
        saveData: saveData
      },
      fallbacks: {
        network: hasFetch ? "fetch" : (hasXHR ? "xmlhttprequest" : "html-form"),
        voiceInput: (env.SpeechRecognition || env.webkitSpeechRecognition) ? "browser-speech" : "text-input",
        voiceOutput: env.speechSynthesis ? "browser-speech" : "text-only",
        storage: (function(){ try { return env.localStorage ? "local-storage" : "memory-only"; } catch (_) { return "memory-only"; } }()),
        interface: profile === "legacy" ? "legacy-text-ui" : (profile === "lite" ? "reduced-motion-lite-ui" : "responsive-ui")
      }
    };
  }
  return { detect: detect };
}));
