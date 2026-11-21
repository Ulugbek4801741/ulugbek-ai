"use strict";
// Coordinated diagnostic plan for 99 specialist roles (not 99 independent model processes).
// Performs bounded, read-only project inventory and configuration checks.
const fs = require("node:fs/promises");
const path = require("node:path");
const catalog = require("./agent-100-catalog");
const SKIP = new Set([".git","node_modules","coverage","dist","build",".next"]);
const MAX_FILES = 5000;
async function walk(root, rel="", out=[]){
  if(out.length>=MAX_FILES)return out;
  let entries;
  try{entries=await fs.readdir(path.join(root,rel),{withFileTypes:true});}catch(_){return out;}
  for(const entry of entries){
    if(out.length>=MAX_FILES)break;
    if(SKIP.has(entry.name))continue;
    const child=path.join(rel,entry.name);
    if(entry.isDirectory())await walk(root,child,out);
    else if(entry.isFile())out.push(child.split(path.sep).join("/"));
  }
  return out;
}
async function diagnose(root=path.resolve(__dirname,"..")){
  const agents=catalog.listAgents().filter(a=>a.id!=="orchestrator");
  const files=await walk(root);
  const findings=[];
  const has=p=>files.includes(p);
  let pkg=null;
  try{pkg=JSON.parse(await fs.readFile(path.join(root,"package.json"),"utf8"));}
  catch(e){findings.push({severity:"critical",code:"PACKAGE_JSON_INVALID",message:"package.json topilmadi yoki JSON xato."});}
  if(pkg){
    if(!pkg.scripts||!pkg.scripts.start)findings.push({severity:"critical",code:"START_SCRIPT_MISSING",message:"package.json ichida start script yo‘q."});
    if(!pkg.scripts||!pkg.scripts.test)findings.push({severity:"warning",code:"TEST_SCRIPT_MISSING",message:"Test script aniqlanmadi."});
    if(!has(pkg.main||"server.js"))findings.push({severity:"critical",code:"ENTRY_FILE_MISSING",message:"package.json main fayli mavjud emas."});
    for(const name of ["express","helmet"]){
      if(!pkg.dependencies?.[name])findings.push({severity:"warning",code:"DEPENDENCY_NOT_DECLARED",message:"Asosiy dependency e’lon qilinmagan: "+name});
    }
  }
  const source=files.filter(f=>/\.(js|cjs|mjs|ts|tsx|jsx|py|java|kt|go|rs)$/.test(f));
  const tests=files.filter(f=>/(^|\/)(test|tests|__tests__)(\/|$)|\.(test|spec)\./i.test(f));
  const configs=files.filter(f=>/(^|\/)(package\.json|Dockerfile|render\.yaml|\.github\/workflows\/)/i.test(f));
  const criticalFiles=["server.js","agent-runtime.js","modules/agent-fleet.js","modules/self-recovery-engine.js"];
  for(const file of criticalFiles)if(!has(file))findings.push({severity:"warning",code:"CORE_FILE_NOT_FOUND",file,message:"Muhim modul topilmadi: "+file});
  const categories=Object.fromEntries([...new Set(agents.map(a=>a.category))].map(c=>[c,agents.filter(a=>a.category===c).length]));
  return {
    ok:findings.every(f=>f.severity!=="critical"),
    mode:"read-only-static-diagnostics",
    agents:{assigned:agents.length,profiles:agents.map(a=>({id:a.id,name:a.name,category:a.category,task:a.specialty})),independentModelProcesses:0},
    inventory:{filesScanned:files.length,scanLimit:MAX_FILES,sourceFiles:source.length,testFiles:tests.length,configurationFiles:configs.length,tests},
    package:{name:pkg?.name||null,version:pkg?.version||null,nodeEngine:pkg?.engines?.node||null,scripts:pkg?.scripts||{},dependenciesDeclared:Object.keys(pkg?.dependencies||{}).length},
    categories,findings,
    limits:["Bu bosqich statik inventar va konfiguratsiya tekshiradi; har bir funksiya ishlashini isbotlamaydi.","Node testlari va endpoint integratsion testlari alohida CI/staging muhitida bajarilishi kerak.","Ochiq GitHub kodlari faqat litsenziyasi tekshirilgan, mos manba sifatida o‘rganiladi; begona kod avtomatik ko‘chirib qo‘shilmaydi.","Hech qanday fayl o‘zgartirilmaydi, buyruq yoki loyiha kodi ishga tushirilmaydi."]
  };
}
module.exports={diagnose};
