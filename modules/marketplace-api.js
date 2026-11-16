"use strict";
const express = require("express");
const crypto = require("node:crypto");
const { Pool } = require("pg");

function createMarketplaceRouter() {
  const router = express.Router();
  const pool = process.env.DATABASE_URL ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  }) : null;
  let schemaReady;
  const cookieName = "ulugbek_session";
  const sessionSecret = process.env.AUTH_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || "";
  const otpSecret = process.env.AUTH_OTP_SECRET || sessionSecret;
  const schema = [
    "CREATE EXTENSION IF NOT EXISTS pgcrypto",
    "CREATE TABLE IF NOT EXISTS marketplace_users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), phone TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, phone_verified_at TIMESTAMPTZ, email_verified_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
    "CREATE TABLE IF NOT EXISTS marketplace_verification_codes (id BIGSERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE, channel TEXT NOT NULL CHECK (channel IN ('email','phone')), code_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id, channel))",
    "CREATE TABLE IF NOT EXISTS marketplace_sessions (token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
    "CREATE INDEX IF NOT EXISTS marketplace_sessions_expiry_idx ON marketplace_sessions(expires_at)",
    "CREATE TABLE IF NOT EXISTS marketplace_courses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE, title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120), instructor TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', price_uzs BIGINT NOT NULL DEFAULT 0 CHECK (price_uzs >= 0), youtube_url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
    "CREATE INDEX IF NOT EXISTS marketplace_courses_public_idx ON marketplace_courses(status, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS marketplace_courses_owner_idx ON marketplace_courses(owner_id, created_at DESC)",
    "CREATE TABLE IF NOT EXISTS marketplace_purchases (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), course_id UUID NOT NULL REFERENCES marketplace_courses(id) ON DELETE RESTRICT, buyer_id UUID NOT NULL REFERENCES marketplace_users(id) ON DELETE RESTRICT, amount_uzs BIGINT NOT NULL CHECK (amount_uzs >= 0), status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')), provider TEXT NOT NULL CHECK (provider IN ('payme','click')), provider_transaction_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), paid_at TIMESTAMPTZ, UNIQUE(course_id, buyer_id))",
    "CREATE TABLE IF NOT EXISTS marketplace_payment_events (id BIGSERIAL PRIMARY KEY, provider TEXT NOT NULL, event_key TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(provider, event_key))"
  ].join(";");

  async function db() {
    if (!pool) { const e = new Error("DATABASE_URL sozlanmagan. Render’da PostgreSQL ulang."); e.statusCode = 503; throw e; }
    if (!schemaReady) schemaReady = pool.query(schema).catch(e => { schemaReady = null; throw e; });
    await schemaReady;
    return pool;
  }
  function fail(res, error, fallback) {
    const status = Number(error.statusCode) || 503;
    return res.status(status).json({ ok: false, error: status < 500 ? error.message : fallback });
  }
  function cleanEmail(value) { return String(value || "").trim().toLowerCase(); }
  function cleanPhone(value) { return String(value || "").replace(/[^\d+]/g, ""); }
  function hash(value, secret = sessionSecret) {
    return crypto.createHmac("sha256", secret || "ulugbek-auth-not-configured").update(String(value)).digest("hex");
  }
  function passwordHash(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    return "scrypt$" + salt + "$" + crypto.scryptSync(password, salt, 64).toString("hex");
  }
  function passwordMatches(password, stored) {
    const [kind, salt, expectedHex] = String(stored || "").split("$");
    if (kind !== "scrypt" || !salt || !expectedHex) return false;
    const actual = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }
  function readCookie(req) {
    const prefix = cookieName + "=";
    const item = String(req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith(prefix));
    if (!item) return "";
    try { return decodeURIComponent(item.slice(prefix.length)); } catch (_) { return ""; }
  }
  function setSessionCookie(res, token) {
    res.setHeader("Set-Cookie", cookieName + "=" + encodeURIComponent(token) + "; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800");
  }
  function clearSessionCookie(res) {
    res.setHeader("Set-Cookie", cookieName + "=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0");
  }
  function requireOrigin(req, res, next) {
    const origin = req.get("origin");
    if (!origin) return next();
    const allowed = new Set(["https://ulugbek4801741.github.io","https://localhost","capacitor://localhost","http://localhost",...(process.env.FRONTEND_ORIGIN || "").split(",").map(x => x.trim().replace(/\/$/, "")).filter(Boolean)]);
    if (!allowed.has(origin)) return res.status(403).json({ ok: false, error: "Ushbu manbadan so‘rovga ruxsat yo‘q." });
    next();
  }
  async function currentUser(req) {
    const token = readCookie(req);
    if (!token) return null;
    const result = await (await db()).query("SELECT u.id,u.phone,u.email,u.phone_verified_at,u.email_verified_at FROM marketplace_sessions s JOIN marketplace_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()", [hash(token)]);
    return result.rows[0] || null;
  }
  async function requireUser(req, res, next) {
    try { req.user = await currentUser(req); if (!req.user) return res.status(401).json({ ok:false,error:"Davom etish uchun hisobingizga kiring." }); next(); }
    catch (e) { return fail(res,e,"Hisob ma’lumotlarini tekshirib bo‘lmadi."); }
  }
  async function deliverEmail(email, code) {
    if (!process.env.RESEND_API_KEY) throw new Error("Email yuborish uchun RESEND_API_KEY sozlanmagan.");
    const response = await fetch("https://api.resend.com/emails", {
      method:"POST",headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({from:process.env.AUTH_EMAIL_FROM || "ULUGBEK AI <onboarding@resend.dev>",to:[email],subject:"ULUGBEK AI tasdiqlash kodi",text:"Tasdiqlash kodingiz: "+code+". Kod 10 daqiqa amal qiladi. Uni hech kimga bermang."}),
      signal:AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error("Email xizmati xabarni yubormadi.");
  }
  async function deliverSms(phone, code) {
    const sid=process.env.TWILIO_ACCOUNT_SID || "", token=process.env.TWILIO_AUTH_TOKEN || "", from=process.env.TWILIO_FROM_NUMBER || "";
    if (!sid || !token || !from) throw new Error("SMS yuborish uchun Twilio SID, token va telefon raqami sozlanmagan.");
    const body=new URLSearchParams({To:phone,From:from,Body:"ULUGBEK AI tasdiqlash kodi: "+code+". Kod 10 daqiqa amal qiladi."});
    const response=await fetch("https://api.twilio.com/2010-04-01/Accounts/"+sid+"/Messages.json",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(sid+":"+token).toString("base64"),"Content-Type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error("SMS xizmati xabarni yubormadi.");
  }
  async function issueCode(client,userId,channel,destination) {
    const code=String(crypto.randomInt(100000,1000000));
    await client.query("INSERT INTO marketplace_verification_codes(user_id,channel,code_hash,expires_at,attempts) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes',0) ON CONFLICT(user_id,channel) DO UPDATE SET code_hash=EXCLUDED.code_hash,expires_at=EXCLUDED.expires_at,attempts=0,created_at=NOW()",[userId,channel,hash(userId+":"+channel+":"+code,otpSecret)]);
    if(channel==="email") await deliverEmail(destination,code); else await deliverSms(destination,code);
  }
  function validYoutube(value) {
    try { const u=new URL(value); return u.protocol==="https:" && ["youtube.com","www.youtube.com","m.youtube.com","youtu.be","www.youtu.be","www.youtube-nocookie.com"].includes(u.hostname); }
    catch (_) { return false; }
  }

  router.get("/status",(_req,res)=>{
    res.set("Cache-Control","no-store");
    res.json({ok:true,databaseConfigured:Boolean(pool),authReady:Boolean(pool&&sessionSecret&&otpSecret),emailDeliveryReady:Boolean(process.env.RESEND_API_KEY),smsDeliveryReady:Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_FROM_NUMBER),payments:{paymeReady:Boolean(process.env.PAYME_MERCHANT_ID&&process.env.PAYME_SECRET_KEY),clickReady:Boolean(process.env.CLICK_SERVICE_ID&&process.env.CLICK_MERCHANT_ID&&process.env.CLICK_SECRET_KEY),liveCallbacksImplemented:false},storage:"postgresql"});
  });
  router.post("/auth/register",requireOrigin,async(req,res)=>{
    try{
      const email=cleanEmail(req.body?.email),phone=cleanPhone(req.body?.phone),password=String(req.body?.password||"");
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ok:false,error:"Email manzilini to‘g‘ri kiriting."});
      if(!/^\+[1-9]\d{7,14}$/.test(phone)) return res.status(400).json({ok:false,error:"Telefonni xalqaro formatda kiriting. Masalan: +998901234567."});
      if(password.length<10||password.length>128) return res.status(400).json({ok:false,error:"Parol kamida 10 ta belgidan iborat bo‘lsin."});
      const client=await db();
      const inserted=await client.query("INSERT INTO marketplace_users(phone,email,password_hash) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id",[phone,email,passwordHash(password)]);
      if(!inserted.rowCount) return res.status(409).json({ok:false,error:"Bu telefon yoki email avval ro‘yxatdan o‘tgan."});
      const userId=inserted.rows[0].id;
      const sent=await Promise.allSettled([issueCode(client,userId,"email",email),issueCode(client,userId,"phone",phone)]);
      if(sent.some(x=>x.status==="rejected")){
        await client.query("DELETE FROM marketplace_users WHERE id=$1",[userId]);
        return res.status(503).json({ok:false,error:sent.find(x=>x.status==="rejected").reason.message,setupRequired:true});
      }
      return res.status(201).json({ok:true,verificationRequired:true,channels:["email","phone"],message:"Email va telefoningizga alohida tasdiqlash kodlari yuborildi."});
    }catch(e){return fail(res,e,"Ro‘yxatdan o‘tishni yakunlab bo‘lmadi.");}
  });
  router.post("/auth/verify",requireOrigin,async(req,res)=>{
    try{
      const email=cleanEmail(req.body?.email),phone=cleanPhone(req.body?.phone),client=await db();
      const found=await client.query("SELECT id FROM marketplace_users WHERE email=$1 AND phone=$2",[email,phone]);
      if(!found.rowCount) return res.status(404).json({ok:false,error:"Ro‘yxatdan o‘tish ma’lumoti topilmadi."});
      const userId=found.rows[0].id;
      for(const [channel,raw] of [["email",req.body?.emailCode],["phone",req.body?.phoneCode]]){
        const code=String(raw||"");
        if(!/^\d{6}$/.test(code)) return res.status(400).json({ok:false,error:"Har ikkala 6 xonali kodni kiriting."});
        const result=await client.query("SELECT code_hash,expires_at,attempts FROM marketplace_verification_codes WHERE user_id=$1 AND channel=$2",[userId,channel]),row=result.rows[0];
        if(!row||new Date(row.expires_at)<=new Date()||row.attempts>=5||hash(userId+":"+channel+":"+code,otpSecret)!==row.code_hash){
          await client.query("UPDATE marketplace_verification_codes SET attempts=attempts+1 WHERE user_id=$1 AND channel=$2",[userId,channel]);
          return res.status(400).json({ok:false,error:channel==="email"?"Email kodi noto‘g‘ri yoki muddati tugagan.":"Telefon kodi noto‘g‘ri yoki muddati tugagan."});
        }
      }
      await client.query("UPDATE marketplace_users SET email_verified_at=NOW(),phone_verified_at=NOW(),updated_at=NOW() WHERE id=$1",[userId]);
      await client.query("DELETE FROM marketplace_verification_codes WHERE user_id=$1",[userId]);
      return res.json({ok:true,verified:true,message:"Telefon va email tasdiqlandi. Endi tizimga kiring."});
    }catch(e){return fail(res,e,"Tasdiqlashni yakunlab bo‘lmadi.");}
  });
  router.post("/auth/login",requireOrigin,async(req,res)=>{
    try{
      const identifier=String(req.body?.identifier||"").trim().toLowerCase(),password=String(req.body?.password||""),client=await db();
      const result=await client.query("SELECT * FROM marketplace_users WHERE email=$1 OR phone=$1",[identifier]),user=result.rows[0];
      if(!user||!passwordMatches(password,user.password_hash)) return res.status(401).json({ok:false,error:"Email/telefon yoki parol noto‘g‘ri."});
      if(!user.email_verified_at||!user.phone_verified_at) return res.status(403).json({ok:false,error:"Avval telefon va emailingizni tasdiqlang."});
      const token=crypto.randomBytes(32).toString("base64url");
      await client.query("INSERT INTO marketplace_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '7 days')",[hash(token),user.id]);
      setSessionCookie(res,token);res.set("Cache-Control","no-store");
      return res.json({ok:true,user:{id:user.id,email:user.email,phone:user.phone}});
    }catch(e){return fail(res,e,"Tizimga kirib bo‘lmadi.");}
  });
  router.get("/auth/me",requireUser,(req,res)=>{res.set("Cache-Control","no-store");res.json({ok:true,user:{id:req.user.id,email:req.user.email,phone:req.user.phone}});});
  router.post("/auth/logout",requireOrigin,async(req,res)=>{
    try{const token=readCookie(req);if(token) await (await db()).query("DELETE FROM marketplace_sessions WHERE token_hash=$1",[hash(token)]);clearSessionCookie(res);return res.json({ok:true});}
    catch(e){return fail(res,e,"Chiqishda xatolik yuz berdi.");}
  });
  router.get("/courses",async(req,res)=>{
    try{
      const client=await db(),q=String(req.query.q||"").trim().slice(0,100),type=["free","paid","all"].includes(req.query.type)?req.query.type:"all";
      const result=await client.query("SELECT c.id,c.title,c.instructor,c.description,c.price_uzs,c.youtube_url,c.created_at FROM marketplace_courses c WHERE c.status='published' AND ($1='' OR c.title ILIKE '%'||$1||'%' OR c.description ILIKE '%'||$1||'%') AND ($2='all' OR ($2='free' AND c.price_uzs=0) OR ($2='paid' AND c.price_uzs>0)) ORDER BY c.created_at DESC LIMIT 100",[q,type]);
      let buyerId=null;try{buyerId=(await currentUser(req))?.id||null;}catch(_){}
      const owned=new Set();
      if(buyerId){const purchases=await client.query("SELECT course_id FROM marketplace_purchases WHERE buyer_id=$1 AND status='paid'",[buyerId]);purchases.rows.forEach(x=>owned.add(x.course_id));}
      res.set("Cache-Control","no-store");
      return res.json({ok:true,courses:result.rows.map(c=>({...c,canWatch:Number(c.price_uzs)===0||owned.has(c.id),youtubeEmbedUrl:Number(c.price_uzs)===0||owned.has(c.id)?c.youtube_url:null}))});
    }catch(e){return fail(res,e,"Kurslar katalogini yuklab bo‘lmadi.");}
  });
  router.post("/courses",requireOrigin,requireUser,async(req,res)=>{
    try{
      const title=String(req.body?.title||"").trim(),instructor=String(req.body?.instructor||"").trim().slice(0,100),description=String(req.body?.description||"").trim().slice(0,3000),price=Number(req.body?.priceUzs||0),youtubeUrl=String(req.body?.youtubeUrl||"").trim();
      if(title.length<2||title.length>120||!description||!Number.isSafeInteger(price)||price<0||price>1000000000||!validYoutube(youtubeUrl)) return res.status(400).json({ok:false,error:"Kurs nomi, tavsifi, narxi yoki YouTube havolasi noto‘g‘ri."});
      const result=await (await db()).query("INSERT INTO marketplace_courses(owner_id,title,instructor,description,price_uzs,youtube_url) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,title,instructor,description,price_uzs,youtube_url,status,created_at",[req.user.id,title,instructor,description,price,youtubeUrl]);
      return res.status(201).json({ok:true,course:result.rows[0]});
    }catch(e){return fail(res,e,"Kursni saqlab bo‘lmadi.");}
  });
  router.patch("/courses/:id",requireOrigin,requireUser,async(req,res)=>{
    try{
      const title=String(req.body?.title||"").trim(),instructor=String(req.body?.instructor||"").trim().slice(0,100),description=String(req.body?.description||"").trim().slice(0,3000),price=Number(req.body?.priceUzs),youtubeUrl=String(req.body?.youtubeUrl||"").trim();
      if(!/^[0-9a-f-]{36}$/i.test(req.params.id)||title.length<2||title.length>120||!description||!Number.isSafeInteger(price)||price<0||!validYoutube(youtubeUrl)) return res.status(400).json({ok:false,error:"Kurs ma’lumotlari noto‘g‘ri."});
      const result=await (await db()).query("UPDATE marketplace_courses SET title=$1,instructor=$2,description=$3,price_uzs=$4,youtube_url=$5,updated_at=NOW() WHERE id=$6 AND owner_id=$7 RETURNING id,title,instructor,description,price_uzs,youtube_url,status",[title,instructor,description,price,youtubeUrl,req.params.id,req.user.id]);
      if(!result.rowCount)return res.status(404).json({ok:false,error:"Kurs topilmadi yoki sizga tegishli emas."});
      return res.json({ok:true,course:result.rows[0]});
    }catch(e){return fail(res,e,"Kursni yangilab bo‘lmadi.");}
  });
  router.delete("/courses/:id",requireOrigin,requireUser,async(req,res)=>{
    try{const result=await(await db()).query("DELETE FROM marketplace_courses WHERE id=$1 AND owner_id=$2 RETURNING id",[req.params.id,req.user.id]);if(!result.rowCount)return res.status(404).json({ok:false,error:"Kurs topilmadi yoki sizga tegishli emas."});return res.json({ok:true,deleted:true});}
    catch(e){return fail(res,e,"Kursni o‘chirib bo‘lmadi.");}
  });
  router.get("/teacher/courses",requireUser,async(req,res)=>{
    try{const result=await(await db()).query("SELECT c.*,COUNT(p.id) FILTER (WHERE p.status='paid')::int AS sales FROM marketplace_courses c LEFT JOIN marketplace_purchases p ON p.course_id=c.id WHERE c.owner_id=$1 GROUP BY c.id ORDER BY c.created_at DESC",[req.user.id]);return res.json({ok:true,courses:result.rows});}
    catch(e){return fail(res,e,"O‘qituvchi kabinetini yuklab bo‘lmadi.");}
  });
  router.get("/student/courses",requireUser,async(req,res)=>{
    try{const result=await(await db()).query("SELECT c.id,c.title,c.instructor,c.description,c.price_uzs,c.youtube_url,p.status AS purchase_status,p.paid_at FROM marketplace_purchases p JOIN marketplace_courses c ON c.id=p.course_id WHERE p.buyer_id=$1 AND p.status='paid' ORDER BY p.paid_at DESC",[req.user.id]);return res.json({ok:true,courses:result.rows});}
    catch(e){return fail(res,e,"Xaridor kabinetini yuklab bo‘lmadi.");}
  });
  router.post("/payments/intent",requireOrigin,requireUser,async(req,res)=>{
    try{
      const provider=String(req.body?.provider||"").toLowerCase();
      if(!["payme","click"].includes(provider))return res.status(400).json({ok:false,error:"Payme yoki Click tanlang."});
      const course=await(await db()).query("SELECT id,owner_id,price_uzs FROM marketplace_courses WHERE id=$1 AND status='published'",[String(req.body?.courseId||"")]);
      if(!course.rowCount)return res.status(404).json({ok:false,error:"Kurs topilmadi."});
      if(course.rows[0].owner_id===req.user.id)return res.status(400).json({ok:false,error:"O‘z kursingizni sotib ololmaysiz."});
      if(Number(course.rows[0].price_uzs)<=0)return res.status(400).json({ok:false,error:"Bu kurs bepul."});
      const ready=provider==="payme"?Boolean(process.env.PAYME_MERCHANT_ID&&process.env.PAYME_SECRET_KEY):Boolean(process.env.CLICK_SERVICE_ID&&process.env.CLICK_MERCHANT_ID&&process.env.CLICK_SECRET_KEY);
      if(!ready)return res.status(503).json({ok:false,error:provider==="payme"?"Payme merchant sozlamalari hali ulanmagan.":"Click merchant sozlamalari hali ulanmagan.",setupRequired:true});
      return res.status(501).json({ok:false,error:"Payme/Click merchant callback protokoli production’dan oldin sandbox’da alohida ishlab chiqilib tekshirilishi kerak.",provider,integrationConfigured:true});
    }catch(e){return fail(res,e,"To‘lov so‘rovini yaratib bo‘lmadi.");}
  });
  return router;
}
module.exports={createMarketplaceRouter};
