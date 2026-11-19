"use strict";
function validUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash ? url : null;
  } catch (_) { return null; }
}
function configuration(env = process.env) {
  const raw = String(env.ULUGBEK_OLLAMA_URL || env.ULUGBEK_OLLAMA_BASE_URL || "").trim();
  const model = String(env.ULUGBEK_OLLAMA_MODEL || "").trim();
  const url = validUrl(raw);
  if (!raw && !model) return { configured:false, provider:"ollama", local:true, apiKeyRequired:false };
  if (!url || !model) return { configured:false, provider:"ollama", local:true, reason:!url?"endpoint-invalid":"model-name-missing", apiKeyRequired:false };
  const endpoint = /\/api\/chat\/?$/i.test(url.pathname) ? url : new URL("/api/chat", url);
  return { configured:true, provider:"ollama", local:true, endpoint:endpoint.toString(), model, tokenConfigured:Boolean(env.ULUGBEK_OLLAMA_TOKEN), apiKeyRequired:false };
}
function request(messages, env = process.env) {
  const config=configuration(env);
  if(!config.configured) throw new Error("Ollama mahalliy model endpointi yoki model nomi sozlanmagan.");
  const headers={"Content-Type":"application/json","Accept":"application/json"};
  if(env.ULUGBEK_OLLAMA_TOKEN)headers.Authorization="Bearer "+String(env.ULUGBEK_OLLAMA_TOKEN);
  return {url:config.endpoint,options:{method:"POST",headers,body:JSON.stringify({
    model:config.model,
    messages:Array.isArray(messages)?messages:[],
    stream:false,
    options:{temperature:0.2}
  })}};
}
function extract(payload) {
  const value=payload?.message?.content;
  return typeof value==="string"?value.trim():"";
}
module.exports={configuration,request,extract,validUrl};
