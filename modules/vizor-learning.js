"use strict";

const express = require("express");
const crypto = require("node:crypto");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");

const DEFAULT_CATEGORIES = [
  "Ingliz tili","Rus tili","Nemis tili","Fransuz tili","Turk tili","Arab tili","Ispan tili","Koreys tili","Xitoy tili","Yapon tili",
  "Matematika","Fizika","Kimyo","Biologiya","Tarix","Geografiya","Ona tili","Adabiyot","Informatika",
  "Word","Excel","PowerPoint","Python","Git/GitHub","SQL/PostgreSQL","Django","AWS","Sun’iy intellekt"
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[1-9]\d{7,14}$/;
const ROLES = new Set(["student", "parent", "teacher"]);

function normalizePhone(value) {
  return String(value || "").replace(/[\s()-]/g, "");
}

function validateEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 254 ? email : "";
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

function safeUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at
  };
}

function createVizorLearning(options = {}) {
  const router = express.Router();
  const secret = String(options.sessionSecret || process.env.SOCIAL_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || "");
  const databaseUrl = String(options.databaseUrl || process.env.DATABASE_URL || "");
  const pool = databaseUrl ? new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000
  }) : null;
  let initError = null;

  const schema = [
    `CREATE TABLE IF NOT EXISTS vizor_users (
      id UUID PRIMARY KEY,
      username VARCHAR(32) NOT NULL UNIQUE,
      display_name VARCHAR(80) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      phone VARCHAR(20) NOT NULL UNIQUE,
      password_hash CHAR(128) NOT NULL,
      password_salt CHAR(32) NOT NULL,
      role VARCHAR(16) NOT NULL CHECK (role IN ('student','parent','teacher','admin')),
      parent_code VARCHAR(16) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status VARCHAR(16) NOT NULL DEFAULT 'active'
    )`,
    `CREATE TABLE IF NOT EXISTS vizor_courses (
      id UUID PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(80) NOT NULL,
      price BIGINT NOT NULL DEFAULT 0 CHECK (price >= 0),
      sales_url TEXT NOT NULL DEFAULT '',
      instructor_id UUID NOT NULL REFERENCES vizor_users(id),
      status VARCHAR(16) NOT NULL DEFAULT 'published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS vizor_lessons (
      id UUID PRIMARY KEY,
      course_id UUID NOT NULL REFERENCES vizor_courses(id) ON DELETE CASCADE,
      title VARCHAR(160) NOT NULL,
      video_url TEXT NOT NULL DEFAULT '',
      live_url TEXT NOT NULL DEFAULT '',
      scheduled_at TIMESTAMPTZ,
      duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 1 AND 240),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS vizor_enrollments (
      id UUID PRIMARY KEY,
      course_id UUID NOT NULL REFERENCES vizor_courses(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES vizor_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(course_id, student_id)
    )`,
    `CREATE TABLE IF NOT EXISTS vizor_progress (
      id UUID PRIMARY KEY,
      lesson_id UUID NOT NULL REFERENCES vizor_lessons(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES vizor_users(id) ON DELETE CASCADE,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      seconds_watched INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(lesson_id, student_id)
    )`,
    `CREATE TABLE IF NOT EXISTS vizor_tests (
      id UUID PRIMARY KEY,
      course_id UUID NOT NULL REFERENCES vizor_courses(id) ON DELETE CASCADE,
      title VARCHAR(160) NOT NULL,
      questions JSONB NOT NULL,
      created_by UUID NOT NULL REFERENCES vizor_users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS vizor_test_attempts (
      id UUID PRIMARY KEY,
      test_id UUID NOT NULL REFERENCES vizor_tests(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES vizor_users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      answers JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS vizor_attendance (
      id UUID PRIMARY KEY,
      lesson_id UUID NOT NULL REFERENCES vizor_lessons(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES vizor_users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      left_at TIMESTAMPTZ,
      UNIQUE(lesson_id, student_id)
    )`,
    `CREATE TABLE IF NOT EXISTS vizor_parent_links (
      id UUID PRIMARY KEY,
      parent_id UUID NOT NULL REFERENCES vizor_users(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES vizor_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(parent_id, student_id)
    )`,
    `CREATE TABLE IF NOT EXISTS vizor_notifications (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES vizor_users(id) ON DELETE CASCADE,
      kind VARCHAR(40) NOT NULL,
      message TEXT NOT NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    "CREATE INDEX IF NOT EXISTS vizor_courses_category_idx ON vizor_courses(category)",
    "CREATE INDEX IF NOT EXISTS vizor_attempts_student_date_idx ON vizor_test_attempts(student_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS vizor_attendance_student_date_idx ON vizor_attendance(student_id, joined_at DESC)",
    "CREATE INDEX IF NOT EXISTS vizor_notifications_user_date_idx ON vizor_notifications(user_id, created_at DESC)"
  ];

  const initPromise = (async () => {
    if (!pool) throw new Error("DATABASE_URL sozlanmagan.");
    for (const statement of schema) await pool.query(statement);
  })().catch(error => {
    initError = error;
    console.error("VIZOR database initialization failed:", error.message);
  });

  const id = () => crypto.randomUUID();
  const clean = (value, max = 500) => String(value ?? "").trim().slice(0, max);
  const sign = payload => {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
    return body + "." + signature;
  };
  function decodeToken(token) {
    if (!secret || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const expected = crypto.createHmac("sha256", secret).update(parts[0]).digest();
    let supplied;
    try { supplied = Buffer.from(parts[1], "base64url"); } catch (_) { return null; }
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
    try {
      const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
      return payload.exp > Date.now() ? payload : null;
    } catch (_) { return null; }
  }
  async function requireDatabase(req, res, next) {
    await initPromise;
    if (!pool || initError) return res.status(503).json({
      ok: false,
      error: "VIZOR PostgreSQL bazasi tayyor emas. Render DATABASE_URL sozlamasini tekshiring."
    });
    next();
  }
  async function auth(req, res, next) {
    try {
      const header = req.get("Authorization") || "";
      const match = header.match(/^Bearer\s+(.+)$/i);
      const payload = match && decodeToken(match[1]);
      if (!payload) return res.status(401).json({ error: "Kirish muddati tugagan. Qayta kiring." });
      const result = await pool.query(
        "SELECT * FROM vizor_users WHERE id=$1 AND status='active'",
        [payload.sub]
      );
      if (!result.rowCount) return res.status(401).json({ error: "Foydalanuvchi topilmadi yoki faol emas." });
      req.user = result.rows[0];
      next();
    } catch (_) {
      res.status(401).json({ error: "Foydalanuvchi sessiyasi tekshirilmadi." });
    }
  }
  const ready = [requireDatabase];

  router.get("/status", async (_req, res) => {
    await initPromise;
    res.set("Cache-Control", "no-store");
    res.json({
      ok: !initError && Boolean(pool),
      ready: !initError && Boolean(pool),
      storage: pool ? "postgresql" : "not-configured",
      error: initError ? "PostgreSQL ulanishi yoki jadval tayyorlashda xato." : (!pool ? "DATABASE_URL sozlanmagan." : null),
      roles: ["student", "parent", "teacher", "admin"],
      features: {
        accounts: Boolean(pool && secret),
        registration: Boolean(pool && secret),
        publicCourseCatalog: true,
        teacherCoursePublishing: true,
        freeEnrollment: true,
        lessonLibrary: true,
        lessonProgress: true,
        quizzesAndScores: true,
        weeklyMonthlyRanking: true,
        parentMonitoring: true,
        attendance: true,
        inAppNotifications: true,
        liveStreamProvider: false,
        automaticLessonRecording: false,
        pushNotifications: false,
        emailSmsVerification: false,
        onlinePaymentProcessing: false
      }
    });
  });

  router.post("/register", registerLimit, ...ready, async (req, res) => {
    if (!secret || secret.length < 32) return res.status(503).json({ error: "Sessiya xavfsizlik kaliti sozlanmagan." });
    const displayName = clean(req.body.displayName, 80);
    const email = validateEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const password = String(req.body.password || "");
    const requestedRole = clean(req.body.role, 16).toLowerCase();
    const role = ROLES.has(requestedRole) ? requestedRole : "student";
    let username = clean(req.body.username, 32).toLowerCase();
    if (!username && email) username = email.split("@")[0].replace(/[^a-z0-9_]/g, "").slice(0, 22) + "_" + crypto.randomBytes(2).toString("hex");
    if (!/^[a-z0-9_]{3,32}$/.test(username)) return res.status(400).json({ error: "Login 3–32 belgi: lotin harfi, raqam yoki _." });
    if (displayName.length < 2 || !email || !PHONE_RE.test(phone) || password.length < 10 || password.length > 200) {
      return res.status(400).json({ error: "F.I.Sh., to‘g‘ri email, xalqaro telefon raqami va kamida 10 belgili parol kiriting." });
    }
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const userId = id();
    const parentCode = crypto.randomBytes(5).toString("hex").toUpperCase();
    try {
      const adminEmail = validateEmail(process.env.VIZOR_ADMIN_EMAIL);
      const finalRole = adminEmail && email === adminEmail ? "admin" : role;
      const result = await pool.query(
        `INSERT INTO vizor_users
          (id,username,display_name,email,phone,password_hash,password_salt,role,parent_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id,username,display_name,email,phone,role,parent_code,created_at`,
        [userId, username, displayName, email, phone, passwordHash, salt, finalRole, parentCode]
      );
      const user = result.rows[0];
      return res.status(201).json({
        ok: true,
        token: sign({ sub: user.id, exp: Date.now() + 30 * 86400000 }),
        user: { ...safeUser(user), email: user.email, phone: user.phone, parentCode: user.role === "student" ? user.parent_code : null },
        verification: { email: false, phone: false, note: "Email/SMS OTP xizmati ulanmagan; aloqa ma’lumotlari hozircha tasdiqlanmagan." }
      });
    } catch (error) {
      if (error.code === "23505") return res.status(409).json({ error: "Bu login, email yoki telefon raqami avval ro‘yxatdan o‘tgan." });
      console.error("VIZOR registration:", error.message);
      return res.status(500).json({ error: "Akkaunt yaratilmadi." });
    }
  });

  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
  const registerLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false });
  router.post("/login", loginLimit, ...ready, async (req, res) => {
    const identifier = clean(req.body.identifier || req.body.username, 254);
    const password = String(req.body.password || "");
    if (!identifier || !password) return res.status(400).json({ error: "Email, telefon yoki login va parol kiriting." });
    const result = await pool.query(
      "SELECT * FROM vizor_users WHERE lower(username)=lower($1) OR lower(email)=lower($1) OR phone=$1 LIMIT 1",
      [identifier]
    );
    const user = result.rows[0];
    if (!user || hashPassword(password, user.password_salt) !== user.password_hash || user.status !== "active") {
      return res.status(401).json({ error: "Kirish ma’lumotlari noto‘g‘ri." });
    }
    return res.json({
      ok: true,
      token: sign({ sub: user.id, exp: Date.now() + 30 * 86400000 }),
      user: { ...safeUser(user), email: user.email, phone: user.phone, parentCode: user.role === "student" ? user.parent_code : null }
    });
  });

  router.get("/me", ...ready, auth, (req, res) => {
    res.json({
      ok: true,
      user: {
        ...safeUser(req.user),
        email: req.user.email,
        phone: req.user.phone,
        parentCode: req.user.role === "student" ? req.user.parent_code : null
      }
    });
  });

  router.get("/courses", ...ready, async (req, res) => {
    const q = clean(req.query.q, 100);
    const category = clean(req.query.category, 80);
    const type = clean(req.query.type, 12);
    const params = [];
    const where = ["c.status='published'"];
    if (category) { params.push(category); where.push("c.category=$" + params.length); }
    if (type === "free") where.push("c.price=0");
    if (type === "paid") where.push("c.price>0");
    if (q) {
      params.push("%" + q.replace(/[%_]/g, "\\$&") + "%");
      where.push("(c.title ILIKE $" + params.length + " ESCAPE '\\\\' OR c.description ILIKE $" + params.length + " ESCAPE '\\\\' OR c.category ILIKE $" + params.length + " ESCAPE '\\\\')");
    }
    const result = await pool.query(
      `SELECT c.id,c.title,c.description,c.category,c.price::integer AS price,c.sales_url AS "salesUrl",c.created_at,
              c.instructor_id AS "authorId",
              (SELECT l.video_url FROM vizor_lessons l WHERE l.course_id=c.id ORDER BY l.sort_order,l.created_at LIMIT 1) AS "videoUrl",
              u.display_name AS instructor,u.username AS instructor_username
         FROM vizor_courses c JOIN vizor_users u ON u.id=c.instructor_id
        WHERE ${where.join(" AND ")}
        ORDER BY c.created_at DESC LIMIT 200`,
      params
    );
    res.set("Cache-Control", "no-store");
    res.json({ ok: true, total: result.rowCount, courses: result.rows });
  });

  router.get("/my/courses", ...ready, auth, async (req, res) => {
    const result = await pool.query(
      `SELECT c.id,c.title,c.description,c.category,c.price::integer AS price,
        c.sales_url AS "salesUrl",c.instructor_id AS "authorId",u.display_name AS instructor,
        (SELECT l.id FROM vizor_lessons l WHERE l.course_id=c.id ORDER BY l.sort_order,l.created_at LIMIT 1) AS "lessonId",
        (SELECT l.video_url FROM vizor_lessons l WHERE l.course_id=c.id ORDER BY l.sort_order,l.created_at LIMIT 1) AS "videoUrl",
        (SELECT COUNT(*)::int FROM vizor_progress p JOIN vizor_lessons l ON l.id=p.lesson_id WHERE l.course_id=c.id AND p.student_id=$1 AND p.completed) AS "completedLessons",
        (SELECT COUNT(*)::int FROM vizor_lessons l WHERE l.course_id=c.id) AS "totalLessons"
       FROM vizor_enrollments e JOIN vizor_courses c ON c.id=e.course_id
       JOIN vizor_users u ON u.id=c.instructor_id
       WHERE e.student_id=$1 ORDER BY e.created_at DESC`,
      [req.user.id]
    );
    res.json({ ok: true, courses: result.rows });
  });

  router.get("/categories", ...ready, async (_req, res) => {
    const result = await pool.query("SELECT DISTINCT category FROM vizor_courses WHERE status='published' ORDER BY category");
    res.json({ ok: true, categories: [...new Set([...DEFAULT_CATEGORIES, ...result.rows.map(row => row.category)])].sort((a,b)=>a.localeCompare(b,"uz")) });
  });
  router.get("/courses/categories", ...ready, async (_req, res) => {
    const result = await pool.query("SELECT DISTINCT category FROM vizor_courses WHERE status='published' ORDER BY category");
    res.json({ ok: true, categories: [...new Set([...DEFAULT_CATEGORIES, ...result.rows.map(row => row.category)])].sort((a,b)=>a.localeCompare(b,"uz")) });
  });

  router.post("/courses", ...ready, auth, async (req, res) => {
    if (!["student", "teacher", "admin"].includes(req.user.role)) return res.status(403).json({ error: "Bu rol kurs joylay olmaydi." });
    const title = clean(req.body.title, 120);
    const description = clean(req.body.description, 3000);
    const category = clean(req.body.category, 80);
    const price = Number(req.body.price);
    const salesUrl = clean(req.body.salesUrl, 1000);
    if (title.length < 3 || description.length < 10 || category.length < 2 || !Number.isSafeInteger(price) || price < 0 || price > 1000000000) {
      return res.status(400).json({ error: "Kurs nomi, tavsifi, yo‘nalishi va to‘g‘ri narxni kiriting." });
    }
    if (price > 0) {
      try { const url = new URL(salesUrl); if (url.protocol !== "https:") throw new Error(); }
      catch (_) { return res.status(400).json({ error: "Pullik kurs uchun HTTPS xarid/to‘lov havolasi kerak." }); }
    }
    const courseId = id();
    const result = await pool.query(
      `INSERT INTO vizor_courses(id,title,description,category,price,sales_url,instructor_id)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,title,description,category,price,sales_url,created_at`,
      [courseId,title,description,category,price,salesUrl,req.user.id]
    );
    if (req.user.role === "student") await pool.query("UPDATE vizor_users SET role='teacher' WHERE id=$1", [req.user.id]);
    res.status(201).json({ ok: true, course: result.rows[0] });
  });

  router.delete("/courses/:id", ...ready, auth, async (req, res) => {
    const result = await pool.query("DELETE FROM vizor_courses WHERE id=$1 AND instructor_id=$2 RETURNING id", [req.params.id,req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Kurs topilmadi yoki sizning kurs emas." });
    res.json({ ok: true });
  });

  router.post("/courses/:id/enroll", ...ready, auth, async (req, res) => {
    if (!["student", "parent"].includes(req.user.role)) return res.status(403).json({ error: "Faqat o‘quvchi akkaunti kursga yozilishi mumkin." });
    const course = await pool.query("SELECT id,price,sales_url FROM vizor_courses WHERE id=$1 AND status='published'", [req.params.id]);
    if (!course.rowCount) return res.sendStatus(404);
    if (Number(course.rows[0].price) > 0) {
      return res.status(402).json({ error: "Pullik kurs to‘lovi tashqi sahifada bajariladi; server to‘lovni hali tasdiqlamaydi.", salesUrl: course.rows[0].sales_url });
    }
    await pool.query(
      "INSERT INTO vizor_enrollments(id,course_id,student_id) VALUES($1,$2,$3) ON CONFLICT(course_id,student_id) DO NOTHING",
      [id(),req.params.id,req.user.id]
    );
    res.status(201).json({ ok: true, enrolled: true });
  });

  router.get("/courses/:id/lessons", ...ready, async (req, res) => {
    const result = await pool.query(
      "SELECT id,course_id,title,video_url,live_url,scheduled_at,duration_minutes,sort_order FROM vizor_lessons WHERE course_id=$1 ORDER BY sort_order,created_at",
      [req.params.id]
    );
    res.json({ ok: true, lessons: result.rows });
  });

  router.post("/courses/:id/lessons", ...ready, auth, async (req, res) => {
    const course = await pool.query("SELECT instructor_id FROM vizor_courses WHERE id=$1", [req.params.id]);
    if (!course.rowCount) return res.sendStatus(404);
    if (course.rows[0].instructor_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Faqat kurs muallifi dars qo‘sha oladi." });
    const title = clean(req.body.title, 160);
    const videoUrl = clean(req.body.videoUrl, 1000);
    const liveUrl = clean(req.body.liveUrl, 1000);
    const duration = Number(req.body.durationMinutes || 60);
    if (title.length < 2 || (!videoUrl && !liveUrl) || !Number.isInteger(duration) || duration < 1 || duration > 240) {
      return res.status(400).json({ error: "Dars nomi, video yoki jonli efir manzili va 1–240 daqiqa davomiylik kerak." });
    }
    if (videoUrl && !/^https:\/\//i.test(videoUrl)) return res.status(400).json({ error: "Video manzili HTTPS bo‘lishi kerak." });
    if (liveUrl && !/^https:\/\//i.test(liveUrl)) return res.status(400).json({ error: "Jonli efir manzili HTTPS bo‘lishi kerak." });
    const scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return res.status(400).json({ error: "Dars sanasi noto‘g‘ri." });
    const result = await pool.query(
      `INSERT INTO vizor_lessons(id,course_id,title,video_url,live_url,scheduled_at,duration_minutes,sort_order)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id,course_id,title,video_url,live_url,scheduled_at,duration_minutes,sort_order`,
      [id(),req.params.id,title,videoUrl,liveUrl,scheduledAt,duration,Number(req.body.sortOrder)||0]
    );
    res.status(201).json({ ok: true, lesson: result.rows[0] });
  });

  router.post("/lessons/:id/attendance", ...ready, auth, async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ error: "Davomat o‘quvchi akkaunti orqali belgilanadi." });
    const lesson = await pool.query("SELECT course_id FROM vizor_lessons WHERE id=$1", [req.params.id]);
    if (!lesson.rowCount) return res.sendStatus(404);
    const enrolled = await pool.query("SELECT 1 FROM vizor_enrollments WHERE course_id=$1 AND student_id=$2", [lesson.rows[0].course_id,req.user.id]);
    if (!enrolled.rowCount) return res.status(403).json({ error: "Avval kursga yoziling." });
    await pool.query(
      "INSERT INTO vizor_attendance(id,lesson_id,student_id) VALUES($1,$2,$3) ON CONFLICT(lesson_id,student_id) DO UPDATE SET joined_at=NOW(),left_at=NULL",
      [id(),req.params.id,req.user.id]
    );
    const parents = await pool.query("SELECT parent_id FROM vizor_parent_links WHERE student_id=$1", [req.user.id]);
    for (const parent of parents.rows) {
      await pool.query(
        "INSERT INTO vizor_notifications(id,user_id,kind,message) VALUES($1,$2,'attendance',$3)",
        [id(),parent.parent_id,req.user.display_name + ": jonli darsga kirdi."]
      );
    }
    res.json({ ok: true, attendance: "present", joinedAt: new Date().toISOString() });
  });

  router.post("/lessons/:id/progress", ...ready, auth, async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ error: "Dars progressi o‘quvchi akkaunti uchun." });
    const lesson = await pool.query("SELECT course_id FROM vizor_lessons WHERE id=$1", [req.params.id]);
    if (!lesson.rowCount) return res.sendStatus(404);
    const enrolled = await pool.query("SELECT 1 FROM vizor_enrollments WHERE course_id=$1 AND student_id=$2", [lesson.rows[0].course_id,req.user.id]);
    if (!enrolled.rowCount) return res.status(403).json({ error: "Avval kursga yoziling." });
    const seconds = Math.max(0,Math.min(86400,Number(req.body.secondsWatched)||0));
    const completed = req.body.completed === true;
    await pool.query(
      `INSERT INTO vizor_progress(id,lesson_id,student_id,completed,seconds_watched)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(lesson_id,student_id) DO UPDATE SET
         completed=vizor_progress.completed OR EXCLUDED.completed,
         seconds_watched=GREATEST(vizor_progress.seconds_watched,EXCLUDED.seconds_watched),
         updated_at=NOW()`,
      [id(),req.params.id,req.user.id,completed,seconds]
    );
    res.json({ ok: true, completed, secondsWatched: seconds });
  });

  router.post("/courses/:id/tests", ...ready, auth, async (req, res) => {
    const course = await pool.query("SELECT instructor_id FROM vizor_courses WHERE id=$1", [req.params.id]);
    if (!course.rowCount) return res.sendStatus(404);
    if (course.rows[0].instructor_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Faqat kurs muallifi test tuza oladi." });
    const title = clean(req.body.title, 160);
    const input = Array.isArray(req.body.questions) ? req.body.questions.slice(0,30) : [];
    if (title.length < 2 || !input.length) return res.status(400).json({ error: "Test nomi va kamida bitta savol kerak." });
    const questions = [];
    for (const item of input) {
      const prompt = clean(item.prompt,500);
      const choices = Array.isArray(item.options) ? item.options.map(x=>clean(x,200)).filter(Boolean).slice(0,6) : [];
      const correctIndex = Number(item.correctIndex);
      if (prompt.length < 3 || choices.length < 2 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
        return res.status(400).json({ error: "Har bir savolda 2–6 javob varianti va to‘g‘ri javob bo‘lishi kerak." });
      }
      questions.push({ prompt, options: choices, correctIndex });
    }
    const result = await pool.query(
      "INSERT INTO vizor_tests(id,course_id,title,questions,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id,course_id,title,created_at",
      [id(),req.params.id,title,JSON.stringify(questions),req.user.id]
    );
    res.status(201).json({ ok: true, test: result.rows[0] });
  });

  router.get("/courses/:id/tests", ...ready, auth, async (req, res) => {
    const enrolled = await pool.query("SELECT 1 FROM vizor_enrollments WHERE course_id=$1 AND student_id=$2", [req.params.id,req.user.id]);
    if (!enrolled.rowCount && req.user.role !== "admin") return res.status(403).json({ error: "Testlarni ko‘rish uchun avval kursga yoziling." });
    const result = await pool.query("SELECT id,title,questions,created_at FROM vizor_tests WHERE course_id=$1 ORDER BY created_at", [req.params.id]);
    res.json({ ok: true, tests: result.rows.map(t=>({id:t.id,title:t.title,questions:t.questions.map(q=>({prompt:q.prompt,options:q.options})),createdAt:t.created_at})) });
  });

  router.post("/tests/:id/attempts", ...ready, auth, async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ error: "Testni o‘quvchi akkaunti topshiradi." });
    const test = await pool.query("SELECT t.id,t.course_id,t.questions FROM vizor_tests t WHERE t.id=$1", [req.params.id]);
    if (!test.rowCount) return res.sendStatus(404);
    const enrolled = await pool.query("SELECT 1 FROM vizor_enrollments WHERE course_id=$1 AND student_id=$2", [test.rows[0].course_id,req.user.id]);
    if (!enrolled.rowCount) return res.status(403).json({ error: "Avval kursga yoziling." });
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const questions = test.rows[0].questions;
    const score = questions.reduce((sum,q,i)=>sum+(Number(answers[i])===q.correctIndex?1:0),0);
    const result = await pool.query(
      "INSERT INTO vizor_test_attempts(id,test_id,student_id,score,total,answers) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,score,total,created_at",
      [id(),req.params.id,req.user.id,score,questions.length,JSON.stringify(answers)]
    );
    const parents = await pool.query("SELECT parent_id FROM vizor_parent_links WHERE student_id=$1", [req.user.id]);
    for (const parent of parents.rows) {
      await pool.query(
        "INSERT INTO vizor_notifications(id,user_id,kind,message) VALUES($1,$2,'test_result',$3)",
        [id(),parent.parent_id,`${req.user.display_name}: test natijasi ${score}/${questions.length}`]
      );
    }
    res.status(201).json({ ok: true, attempt: result.rows[0], percentage: Math.round(score*100/questions.length) });
  });

  router.post("/parent/link", ...ready, auth, async (req, res) => {
    if (req.user.role !== "parent") return res.status(403).json({ error: "Bu amal ota-ona akkaunti uchun." });
    const code = clean(req.body.parentCode,16).toUpperCase();
    const child = await pool.query("SELECT id,display_name,role FROM vizor_users WHERE parent_code=$1 AND status='active'", [code]);
    if (!child.rowCount || child.rows[0].role !== "student") return res.status(404).json({ error: "O‘quvchi kodi topilmadi." });
    if (child.rows[0].id === req.user.id) return res.status(400).json({ error: "O‘z akkauntingizni ulay olmaysiz." });
    await pool.query(
      "INSERT INTO vizor_parent_links(id,parent_id,student_id) VALUES($1,$2,$3) ON CONFLICT(parent_id,student_id) DO NOTHING",
      [id(),req.user.id,child.rows[0].id]
    );
    res.json({ ok: true, linked: true, child: { id: child.rows[0].id, displayName: child.rows[0].display_name } });
  });

  router.get("/parent/children", ...ready, auth, async (req, res) => {
    if (req.user.role !== "parent") return res.status(403).json({ error: "Ota-ona kabineti faqat parent roli uchun." });
    const result = await pool.query(
      `SELECT u.id,u.display_name,
        (SELECT COUNT(*)::int FROM vizor_enrollments e WHERE e.student_id=u.id) AS courses,
        (SELECT COUNT(*)::int FROM vizor_progress p WHERE p.student_id=u.id AND p.completed) AS completed_lessons,
        (SELECT COUNT(*)::int FROM vizor_attendance a WHERE a.student_id=u.id AND a.joined_at >= NOW()-INTERVAL '30 days') AS attendance_30d,
        (SELECT COALESCE(ROUND(AVG(t.score::numeric*100/NULLIF(t.total,0))),0)::int FROM vizor_test_attempts t WHERE t.student_id=u.id) AS average_score,
        (SELECT MAX(a.joined_at) FROM vizor_attendance a WHERE a.student_id=u.id) AS last_attendance
       FROM vizor_parent_links l JOIN vizor_users u ON u.id=l.student_id
       WHERE l.parent_id=$1 ORDER BY u.display_name`,
      [req.user.id]
    );
    res.json({ ok: true, children: result.rows });
  });

  router.get("/teacher/courses", ...ready, auth, async (req, res) => {
    if (!["teacher","admin"].includes(req.user.role)) return res.status(403).json({ error: "O‘qituvchi kabineti faqat teacher roliga ochiq." });
    const result = await pool.query(
      `SELECT c.id,c.title,c.category,c.price,c.created_at,
        (SELECT COUNT(*)::int FROM vizor_enrollments e WHERE e.course_id=c.id) AS students,
        (SELECT COUNT(*)::int FROM vizor_lessons l WHERE l.course_id=c.id) AS lessons
       FROM vizor_courses c WHERE c.instructor_id=$1 ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ ok: true, courses: result.rows });
  });

  router.get("/rankings", ...ready, async (req, res) => {
    const period = req.query.period === "month" ? "month" : "week";
    const interval = period === "month" ? "1 month" : "7 days";
    const result = await pool.query(
      `SELECT u.id,u.display_name,
        COALESCE(SUM(a.score),0)::int AS points,
        COALESCE(SUM(a.total),0)::int AS questions,
        COUNT(a.id)::int AS attempts
       FROM vizor_users u LEFT JOIN vizor_test_attempts a
         ON a.student_id=u.id AND a.created_at >= NOW()-$1::interval
       WHERE u.role='student'
       GROUP BY u.id,u.display_name
       ORDER BY points DESC,attempts DESC,u.display_name ASC LIMIT 100`,
      [interval]
    );
    res.json({ ok: true, period, rankings: result.rows });
  });

  router.get("/notifications", ...ready, auth, async (req, res) => {
    const result = await pool.query(
      "SELECT id,kind,message,read_at,created_at FROM vizor_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
      [req.user.id]
    );
    res.json({ ok: true, notifications: result.rows });
  });

  router.post("/notifications/:id/read", ...ready, auth, async (req, res) => {
    await pool.query("UPDATE vizor_notifications SET read_at=NOW() WHERE id=$1 AND user_id=$2", [req.params.id,req.user.id]);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { createVizorLearning, normalizePhone, validateEmail, hashPassword };
