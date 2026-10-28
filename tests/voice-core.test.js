'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const voice=require('../public/voice-core.js');

test('normalizes speech in Uzbek',()=>{assert.equal(voice.normalizeTranscript('  SALOM,   DUNYO! '),'salom, dunyo');});
test('classifies allow-listed commands only',()=>{assert.equal(voice.classifyCommand('YUBOR!'),'submit');assert.equal(voice.classifyCommand('Chatni tozala'),'clear');assert.equal(voice.classifyCommand('Sozlamalarni och'),'settings');assert.equal(voice.classifyCommand('Ovozni to‘xtat'),'stopSpeech');assert.equal(voice.classifyCommand('hisobimdan pul yubor'),'dictation');});
test('canonicalizes valid BCP-47 tags and rejects invalid ones',()=>{assert.equal(voice.normalizeLanguage('en-us'),'en-US');assert.equal(voice.normalizeLanguage('not_a_language'),null);});
test('offline mode never silently falls back to online',()=>{assert.deepEqual(voice.chooseEngine('offline',{offlineSpeechRecognition:false,onlineSpeechRecognition:true}),{engine:null,mode:'offline',error:'OFFLINE_MODEL_NOT_INSTALLED'});});
test('online mode reports possible remote processing',()=>{const result=voice.chooseEngine('online',{offlineSpeechRecognition:false,onlineSpeechRecognition:true});assert.equal(result.engine,'browser');assert.match(result.warning,/remote/);});
test('auto mode prefers verified local engine when available',()=>{assert.deepEqual(voice.chooseEngine('auto',{offlineSpeechRecognition:true,onlineSpeechRecognition:true}),{engine:'on-device',mode:'offline'});});
test('unknown mode safely normalizes to auto',()=>{assert.equal(voice.chooseEngine('unexpected',{offlineSpeechRecognition:false,onlineSpeechRecognition:false}).mode,'auto');});