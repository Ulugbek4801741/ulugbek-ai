"use strict";
const express=require("express"),crypto=require("node:crypto"),fs=require("node:fs/promises"),path=require("node:path");
function createSocialNetwork(options={}){
 const verifyAccountToken=typeof options.verifyAccountToken==="function"?options.verifyAccountToken:null;
 const r=express.Router(),dir=path.resolve(process.env.ULUGBEK_DATA_DIR||path.join(process.cwd(),"data")),media=path.join(dir,"social-media"),file=path.join(dir,"social-network.json"),secret=process.env.SOCIAL_SESSION_SECRET||process.env.ADMIN_SESSION_SECRET||"",max=8*1024*1024;
 let db={users:[],posts:[],comments:[],likes:[],messages:[],groups:[],courses:[]},queue=Promise.resolve();
 const id=()=>crypto.randomUUID(),clean=(v,n=500)=>String(v||"").trim().slice(0,n),safe=u=>({id:u.id,username:u.username,displayName:u.displayName,createdAt:u.createdAt});
 async function save(){queue=queue.then(async()=>{await fs.mkdir(dir,{recursive:true});const tmp=file+".tmp";await fs.writeFile(tmp,JSON.stringify(db),{mode:0o600});await fs.rename(tmp,file)});return queue}
 async function init(){await fs.mkdir(media,{recursive:true});try{const d=JSON.parse(await fs.readFile(file,"utf8"));for(const k of Object.keys(db))if(Array.isArray(d[k]))db[k]=d[k]}catch(e){if(e.code!=="ENOENT")console.error("Social DB:",e.message)}}
 const sign=p=>{const a=Buffer.from(JSON.stringify(p)).toString("base64url");return a+"."+crypto.createHmac("sha256",secret).update(a).digest("base64url")};
 async function auth(req,res,next){
  try{
   await storageReady;
   const header=String(req.get("Authorization")||"").replace(/^Bearer\\s+/i,"");
   const parts=header.split(".");
   let user=null;
   if(secret&&parts.length===2){
    try{
     const expected=crypto.createHmac("sha256",secret).update(parts[0]).digest();
     const supplied=Buffer.from(parts[1],"base64url");
     if(expected.length===supplied.length&&crypto.timingSafeEqual(expected,supplied)){
      const payload=JSON.parse(Buffer.from(parts[0],"base64url"));
      user=db.users.find(item=>item.id===payload.sub&&payload.exp>Date.now()&&item.status==="active")||null;
     }
    }catch(_){}
   }
   if(!user&&verifyAccountToken&&header){
    const account=await verifyAccountToken(header);
    if(account&&account.id){
     const accountId=String(account.id);
     user=db.users.find(item=>item.id===accountId)||null;
     if(!user){
      const base=clean(account.username,24).toLowerCase().replace(/[^a-z0-9_]/g,"")||"user";
      let username=base;
      if(db.users.some(item=>item.username===username&&item.id!==accountId)){
       username=(base.slice(0,17)+"_"+accountId.replace(/-/g,"").slice(0,6)).slice(0,24);
      }
      user={id:accountId,username,displayName:clean(account.displayName,60)||username,createdAt:account.createdAt||new Date().toISOString(),status:"active",linkedAccount:true};
      db.users.push(user);
      await save();
     }else{
      user.displayName=clean(account.displayName,60)||user.displayName;
      user.status="active";
      await save();
     }
    }
   }
   if(!user)throw Error("Sessiya yaroqsiz");
   req.user=user;
   next();
  }catch(_){res.status(401).json({error:"ULUGBEK AI akkauntingizga qayta kiring."})}
 }
 const hash=(p,s)=>crypto.scryptSync(p,s,64).toString("hex");
 r.get("/status",(_q,s)=>s.json({ok:true,apiReady:true,features:{accounts:!!secret,posts:true,comments:true,likes:true,directMessages:true,groups:true,mediaUpload:true,videoCalls:false,groupVideoCalls:false},storage:{mode:"server-local",durableOnRenderFree:false,maxUploadBytes:max,warning:"Render Free xotirasi doimiy emas. Cloud storage kalitlari hali ulanmagan."}}));
 r.post("/register",async(q,s)=>{if(!secret)return s.status(503).json({error:"SOCIAL_SESSION_SECRET serverda sozlanmagan."});const username=clean(q.body.username,24).toLowerCase(),password=String(q.body.password||"");if(!/^[a-z0-9_]{3,24}$/.test(username))return s.status(400).json({error:"Login 3–24 belgi: lotin harfi, raqam yoki _."});if(password.length<10||password.length>200)return s.status(400).json({error:"Parol kamida 10 belgi bo‘lsin."});if(db.users.some(u=>u.username===username))return s.status(409).json({error:"Login band."});const salt=crypto.randomBytes(16).toString("hex"),u={id:id(),username,displayName:clean(q.body.displayName,60)||username,salt,passwordHash:hash(password,salt),createdAt:new Date().toISOString(),status:"active"};db.users.push(u);await save();s.status(201).json({ok:true,token:sign({sub:u.id,exp:Date.now()+30*86400000}),user:safe(u)})});
 r.post("/login",(q,s)=>{if(!secret)return s.status(503).json({error:"SOCIAL_SESSION_SECRET sozlanmagan."});const u=db.users.find(x=>x.username===clean(q.body.username,24).toLowerCase()),p=String(q.body.password||"");if(!u||hash(p,u.salt)!==u.passwordHash)return s.status(401).json({error:"Login yoki parol noto‘g‘ri."});s.json({ok:true,token:sign({sub:u.id,exp:Date.now()+30*86400000}),user:safe(u)})});
 r.get("/me",auth,(q,s)=>s.json({ok:true,user:safe(q.user)}));
 r.get("/posts",(_q,s)=>s.json({ok:true,posts:db.posts.slice(-100).reverse().map(p=>({...p,author:safe(db.users.find(u=>u.id===p.userId)||{id:p.userId,username:"unknown",displayName:"Foydalanuvchi"}),comments:db.comments.filter(c=>c.postId===p.id).slice(-30),likes:db.likes.filter(l=>l.postId===p.id).length}))}));
 r.post("/posts",auth,async(q,s)=>{const text=clean(q.body.text,2000),mediaUrl=clean(q.body.mediaUrl,500);if(!text&&!mediaUrl)return s.status(400).json({error:"Post matni yoki media kerak."});if(mediaUrl&&!/^\/api\/social\/media\/[a-f0-9-]+\.(jpg|png|webp|mp4|webm|ogg|mp3|mpeg)$/.test(mediaUrl))return s.status(400).json({error:"Media manzili noto‘g‘ri."});const p={id:id(),userId:q.user.id,text,mediaUrl,createdAt:new Date().toISOString()};db.posts.push(p);await save();s.status(201).json({ok:true,post:p})});
 r.post("/media",auth,async(q,s)=>{const m=String(q.body.dataUrl||"").match(/^data:(image\/(jpeg|png|webp)|video\/(mp4|webm)|audio\/(webm|ogg|mpeg));base64,([A-Za-z0-9+/=]+)$/);if(!m)return s.status(400).json({error:"JPG, PNG, WEBP, MP4, WEBM, OGG yoki MP3 fayl yuboring."});const b=Buffer.from(m[5],"base64");if(!b.length||b.length>max)return s.status(413).json({error:"Fayl 8 MB dan oshmasin."});const ext=m[2]||m[3]||m[4];const name=id()+"."+(ext==="mpeg"?"mp3":ext);await fs.writeFile(path.join(media,name),b,{flag:"wx",mode:0o600});s.status(201).json({ok:true,mediaUrl:"/api/social/media/"+name,sizeBytes:b.length})});
 r.get("/media/:name",async(q,s)=>{if(!/^[a-f0-9-]+\.(jpg|png|webp|mp4|webm|ogg|mp3|mpeg)$/.test(q.params.name))return s.sendStatus(404);const f=path.join(media,q.params.name);try{const st=await fs.stat(f);if(!st.isFile()||st.size>max)return s.sendStatus(404);s.set("Cache-Control","public,max-age=3600");s.type(path.extname(f));s.sendFile(f)}catch(_){s.sendStatus(404)}});
 r.post("/posts/:id/comments",auth,async(q,s)=>{const p=db.posts.find(x=>x.id===q.params.id),text=clean(q.body.text,1000);if(!p)return s.status(404).json({error:"Post topilmadi."});if(!text)return s.status(400).json({error:"Izoh bo‘sh."});const c={id:id(),postId:p.id,userId:q.user.id,username:q.user.username,text,createdAt:new Date().toISOString()};db.comments.push(c);await save();s.status(201).json({ok:true,comment:c})});
 r.post("/posts/:id/like",auth,async(q,s)=>{if(!db.posts.some(p=>p.id===q.params.id))return s.sendStatus(404);const i=db.likes.findIndex(x=>x.postId===q.params.id&&x.userId===q.user.id);if(i>=0)db.likes.splice(i,1);else db.likes.push({postId:q.params.id,userId:q.user.id});await save();s.json({ok:true,liked:i<0,likes:db.likes.filter(x=>x.postId===q.params.id).length})});
 r.post("/messages",auth,async(q,s)=>{const to=db.users.find(u=>u.username===clean(q.body.to,24).toLowerCase()),text=clean(q.body.text,2000);if(!to)return s.status(404).json({error:"Foydalanuvchi topilmadi."});if(to.id===q.user.id||!text)return s.status(400).json({error:"Xabar noto‘g‘ri."});const m={id:id(),fromId:q.user.id,fromUsername:q.user.username,toId:to.id,toUsername:to.username,text,createdAt:new Date().toISOString()};db.messages.push(m);await save();s.status(201).json({ok:true,message:m})});
 r.get("/messages/:username",auth,(q,s)=>{const u=db.users.find(x=>x.username===clean(q.params.username,24).toLowerCase());if(!u)return s.sendStatus(404);s.json({ok:true,messages:db.messages.filter(m=>(m.fromId===q.user.id&&m.toId===u.id)||(m.fromId===u.id&&m.toId===q.user.id)).slice(-100)})});

 // Public course marketplace: visitors can browse; signed-in users can publish.
 const youtubeId=value=>{try{const u=new URL(value);if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||"";if(!/(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$/.test(u.hostname))return"";return u.searchParams.get("v")||u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,})/)?.[1]||""}catch(_){return""}};
 r.get("/courses/categories",(_q,s)=>{const categories=[...new Set(db.courses.map(x=>x.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"uz"));s.json({ok:true,categories})});
 r.get("/courses",(q,s)=>{const search=clean(q.query.q,100).toLocaleLowerCase("uz"),category=clean(q.query.category,80),type=clean(q.query.type,12);let items=db.courses.filter(x=>x.status==="published");if(category)items=items.filter(x=>x.category===category);if(type==="free")items=items.filter(x=>x.price===0);if(type==="paid")items=items.filter(x=>x.price>0);if(search)items=items.filter(x=>(x.title+" "+x.description+" "+x.instructor+" "+x.category).toLocaleLowerCase("uz").includes(search));s.set("Cache-Control","no-store").json({ok:true,total:items.length,courses:items.slice(-200).reverse()})});
 r.post("/courses",auth,async(q,s)=>{const title=clean(q.body.title,100),description=clean(q.body.description,1500),category=clean(q.body.category,80),instructor=clean(q.body.instructor,80)||q.user.displayName,videoUrl=clean(q.body.videoUrl,500),salesUrl=clean(q.body.salesUrl,500),price=Number(q.body.price);if(title.length<3||description.length<10||category.length<2)return s.status(400).json({error:"Kurs nomi, kamida 10 belgili tavsif va yo‘nalish kiriting."});if(!Number.isSafeInteger(price)||price<0||price>1000000000)return s.status(400).json({error:"Narx 0 dan 1 milliard so‘mgacha butun son bo‘lsin."});if(!youtubeId(videoUrl))return s.status(400).json({error:"YouTube video havolasi noto‘g‘ri."});if(price>0){try{const u=new URL(salesUrl);if(u.protocol!=="https:")throw Error()}catch(_){return s.status(400).json({error:"Pullik kurs uchun xavfsiz HTTPS to‘lov/xarid havolasi kerak."})}}const course={id:id(),title,description,category,instructor,videoUrl,salesUrl:price===0?"":salesUrl,price,authorId:q.user.id,authorUsername:q.user.username,authorName:q.user.displayName,status:"published",createdAt:new Date().toISOString()};db.courses.push(course);await save();s.status(201).json({ok:true,course})});
 r.delete("/courses/:id",auth,async(q,s)=>{const i=db.courses.findIndex(x=>x.id===q.params.id);if(i<0)return s.sendStatus(404);if(db.courses[i].authorId!==q.user.id)return s.status(403).json({error:"Faqat kurs muallifi o‘chira oladi."});db.courses.splice(i,1);await save();s.json({ok:true})});

 r.get("/groups",(_q,s)=>s.json({ok:true,groups:db.groups.map(g=>({...g,members:g.members.length}))}));
 r.post("/groups",auth,async(q,s)=>{const name=clean(q.body.name,80);if(name.length<3)return s.status(400).json({error:"Guruh nomi kamida 3 belgi."});const g={id:id(),name,description:clean(q.body.description,300),ownerId:q.user.id,members:[q.user.id],createdAt:new Date().toISOString()};db.groups.push(g);await save();s.status(201).json({ok:true,group:{...g,members:1}})});
 r.post("/groups/:id/join",auth,async(q,s)=>{const g=db.groups.find(x=>x.id===q.params.id);if(!g)return s.sendStatus(404);if(!g.members.includes(q.user.id))g.members.push(q.user.id);await save();s.json({ok:true,members:g.members.length})});
 const storageReady=init();storageReady.catch(e=>console.error("Social storage init:",e.message));return r;
}
module.exports={createSocialNetwork};
