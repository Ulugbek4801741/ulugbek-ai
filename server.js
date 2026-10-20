const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("node:path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "20kb" }));
app.use("/api/", rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false
}));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "ULUGBEK AI", version: "0.2.0" });
});

app.post("/api/chat", (req, res) => {
  const message = typeof req.body?.message === "string"
    ? req.body.message.trim()
    : "";

  if (!message) {
    return res.status(400).json({ error: "Xabar bo‘sh bo‘lmasligi kerak." });
  }
  if (message.length > 4000) {
    return res.status(413).json({ error: "Xabar 4000 belgidan oshmasligi kerak." });
  }

  // Hozircha demo endpoint. Haqiqiy AI modeli keyingi bosqichda ulanadi.
  return res.json({
    reply: "Xabaringiz qabul qilindi. Hozir ULUGBEK AI sinov rejimida; haqiqiy AI modeli hali ulanmagan.",
    mode: "demo",
    receivedCharacters: message.length
  });
});

app.use(express.static(path.join(__dirname, "public"), {
  etag: true,
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));

app.use((err, _req, res, _next) => {
  console.error("Server xatosi:", err.message);
  res.status(500).json({ error: "Ichki server xatosi." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ULUGBEK AI serveri ${PORT}-portda ishga tushdi.`);
});
