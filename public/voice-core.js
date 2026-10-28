(function(root){
  'use strict';
  const LANGUAGES = Object.freeze([
    {tag:'uz-UZ',name:'O‘zbekcha',script:'Latn',stage:1},
    {tag:'ru-RU',name:'Русский',script:'Cyrl',stage:1},
    {tag:'en-US',name:'English',script:'Latn',stage:1},
    {tag:'hi-IN',name:'हिन्दी',script:'Deva',stage:1},
    {tag:'tr-TR',name:'Türkçe',script:'Latn',stage:2}
  ]);
  const COMMANDS = Object.freeze({
    submit:['yubor','jo‘nat',"jo'nat",'yuborish','savolni yubor'],
    clear:['chatni tozala','suhbatni tozala','yangi chat'],
    settings:['sozlamalarni och','sozlamalar'],
    stopSpeech:['ovozni to‘xtat','ovozni toxtat','o‘qishni to‘xtat','oqishni toxtat']
  });
  function normalizeTranscript(value){return String(value||'').normalize('NFC').toLocaleLowerCase('uz-UZ').replace(/[.!?,;:]+$/u,'').replace(/\s+/gu,' ').trim();}
  function classifyCommand(value){const text=normalizeTranscript(value);for(const [command,phrases] of Object.entries(COMMANDS)){if(phrases.some(p=>normalizeTranscript(p)===text))return command;}return 'dictation';}
  function normalizeLanguage(tag){if(typeof tag!=='string'||!tag.trim())return null;try{return Intl.getCanonicalLocales(tag.trim())[0]||null;}catch(_){return null;}}
  function getCapabilities(){return {languages:LANGUAGES.map(x=>({...x})),onlineSpeechRecognition:!!(root.SpeechRecognition||root.webkitSpeechRecognition),onDeviceSpeechRecognition:false,offlineSpeechRecognition:false,textToSpeech:!!root.speechSynthesis,notes:'Offline model not installed by this module; do not silently fall back to a network engine.'};}
  function chooseEngine(mode,capabilities){const m=['auto','online','offline'].includes(mode)?mode:'auto';const c=capabilities||getCapabilities();if(m==='offline')return c.offlineSpeechRecognition?{engine:'on-device',mode:'offline'}:{engine:null,mode:'offline',error:'OFFLINE_MODEL_NOT_INSTALLED'};if(m==='online')return c.onlineSpeechRecognition?{engine:'browser',mode:'online',warning:'Browser speech recognition may send audio to a remote service.'}:{engine:null,mode:'online',error:'ONLINE_ENGINE_UNAVAILABLE'};if(c.offlineSpeechRecognition)return {engine:'on-device',mode:'offline'};if(c.onlineSpeechRecognition)return {engine:'browser',mode:'online',warning:'Auto mode uses browser speech recognition; audio may be processed remotely.'};return {engine:null,mode:'auto',error:'NO_SPEECH_ENGINE'};}
  const api={LANGUAGES,COMMANDS,normalizeTranscript,classifyCommand,normalizeLanguage,getCapabilities,chooseEngine};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ULUGBEKVoiceCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);