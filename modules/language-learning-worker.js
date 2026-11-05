"use strict";
const fs=require("node:fs/promises"),path=require("node:path");
const languageCognition=require("./language-cognition");
const DATA_DIR=path.resolve(process.env.ULUGBEK_DATA_DIR||path.join(__dirname,"..","data"));
const KNOWLEDGE_FILE=path.join(DATA_DIR,"knowledge.json");
const INTERVAL_MS=Math.max(60000,Number(process.env.LANGUAGE_TRAINING_INTERVAL_MS)||5*60000);
let timer=null,running=false,stopped=false,startedAt=null,lastRunAt=null,lastResult=null,lastError=null;
async function readKnowledge(){try{const data=JSON.parse(await fs.readFile(KNOWLEDGE_FILE,"utf8"));return Array.isArray(data)?data:[];}catch(e){if(e.code==="ENOENT")return[];throw e;}}
async function cycle(){
 if(running||stopped)return;running=true;lastRunAt=new Date().toISOString();
 try{await languageCognition.initialize();lastResult=await languageCognition.trainFromEntries(await readKnowledge());lastError=null;}
 catch(e){lastError=String(e.message||e).slice(0,240);}
 finally{running=false;if(!stopped)timer=setTimeout(cycle,INTERVAL_MS);}
}
function start(){if(timer||running)return status();stopped=false;startedAt=startedAt||new Date().toISOString();void cycle();return status();}
function stop(){stopped=true;if(timer)clearTimeout(timer);timer=null;}
function status(){return{enabled:!stopped,running,startedAt,lastRunAt,lastResult,lastError,intervalMinutes:Math.round(INTERVAL_MS/60000),...languageCognition.status()};}
module.exports={start,stop,cycle,status};
