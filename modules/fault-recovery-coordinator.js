"use strict";
/**
 * Fault-recovery coordinator: retry, alternate handler, and diagnostic delegation.
 * It deliberately does NOT patch live source code or restart production by itself.
 */
const catalog = require("./agent-100-catalog");
const DEFAULTS = Object.freeze({maxAttempts:2, timeoutMs:15000, backoffMs:250, circuitThreshold:3, circuitResetMs:30000});
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
class FaultRecoveryCoordinator {
 constructor(options={}) { this.options={...DEFAULTS,...options}; this.failures=new Map(); this.circuits=new Map(); }
 async execute(feature, primary, fallback, diagnose=async()=>null) {
  const key=String(feature||"unknown"); const circuit=this.circuits.get(key);
  if(circuit && circuit.openUntil>Date.now()) {
   if(typeof fallback!=="function") throw new Error("Circuit open for "+key+" and no fallback available");
   return {ok:true,source:"fallback-circuit-open",value:await this._call(fallback),recovered:true};
  }
  let lastError;
  for(let attempt=1;attempt<=this.options.maxAttempts;attempt++) {
   try { return {ok:true,source:"primary",value:await this._call(primary),recovered:false,attempt}; }
   catch(error) { lastError=error; if(attempt<this.options.maxAttempts) await sleep(this.options.backoffMs*attempt); }
  }
  const agents=catalog.selectForTask("function failure diagnosis repair "+key,6);
  let diagnosis=null; try { diagnosis=await diagnose(lastError,agents); } catch(_) { diagnosis=null; }
  if(typeof fallback==="function") {
   try { const value=await this._call(fallback); this._recordSuccess(key); return {ok:true,source:"fallback-after-primary-failure",value,recovered:true,primaryError:String(lastError),diagnosis,agents:agents.map(a=>a.id)}; }
   catch(fallbackError) { lastError=fallbackError; }
  }
  this._recordFailure(key);
  return {ok:false,source:"none",error:String(lastError),diagnosis,agents:agents.map(a=>a.id),repairSuggested:true};
 }
 async _call(fn) {
  if(typeof fn!=="function") throw new TypeError("Handler must be a function");
  let timer;
  return Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("Handler timeout")),this.options.timeoutMs);})]).finally(()=>clearTimeout(timer));
 }
 _recordFailure(key) { const count=(this.failures.get(key)||0)+1; this.failures.set(key,count); if(count>=this.options.circuitThreshold)this.circuits.set(key,{openUntil:Date.now()+this.options.circuitResetMs}); }
 _recordSuccess(key) { this.failures.delete(key); this.circuits.delete(key); }
 status() { return {featuresTracked:this.failures.size,circuitsOpen:[...this.circuits.entries()].filter(([,c])=>c.openUntil>Date.now()).map(([feature])=>feature),policy:"bounded retries, fallback, diagnostics; no automatic live code mutation"}; }
}
module.exports={FaultRecoveryCoordinator,DEFAULTS};
