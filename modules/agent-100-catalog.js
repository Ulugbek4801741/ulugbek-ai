"use strict";
// ULUGBEK AI: 100 scoped specialist profiles. Profiles are prompts/roles,
// not 100 separate model processes. Fleet scheduler limits concurrency.
const AGENTS = [
  {
    "id": "orchestrator",
    "name": "Bosh koordinator",
    "specialty": "Vazifani agentlarga taqsimlaydi va natijalarni birlashtiradi",
    "category": "management"
  },
  {
    "id": "taskPlanner",
    "name": "Vazifa rejalashtiruvchi",
    "specialty": "Murakkab ishlarni bosqichlarga ajratadi",
    "category": "management"
  },
  {
    "id": "goalAnalyst",
    "name": "Maqsad tahlilchisi",
    "specialty": "Talab va muvaffaqiyat mezonlarini aniqlaydi",
    "category": "management"
  },
  {
    "id": "logicAnalyst",
    "name": "Mantiq tahlilchisi",
    "specialty": "Sabab-oqibat va mantiqiy bog‘lanishlarni tekshiradi",
    "category": "management"
  },
  {
    "id": "decisionAdvisor",
    "name": "Qaror maslahatchisi",
    "specialty": "Variantlar va oqibatlarni solishtiradi",
    "category": "management"
  },
  {
    "id": "riskAnalyst",
    "name": "Xavf tahlilchisi",
    "specialty": "Xavflar va ehtimoliy muammolarni baholaydi",
    "category": "management"
  },
  {
    "id": "priorityManager",
    "name": "Ustuvorlik boshqaruvchisi",
    "specialty": "Eng muhim vazifalarni ajratadi",
    "category": "management"
  },
  {
    "id": "workflowDesigner",
    "name": "Ish jarayoni dizayneri",
    "specialty": "Ish oqimlarini optimallashtiradi",
    "category": "management"
  },
  {
    "id": "complexityEstimator",
    "name": "Murakkablik baholovchisi",
    "specialty": "Vazifa hajmi va qiyinligini baholaydi",
    "category": "management"
  },
  {
    "id": "qualityCoordinator",
    "name": "Sifat koordinatori",
    "specialty": "Agent natijalarining umumiy sifatini nazorat qiladi",
    "category": "management"
  },
  {
    "id": "webResearcher",
    "name": "Internet tadqiqotchisi",
    "specialty": "Ochiq internet manbalaridan ma’lumot izlaydi",
    "category": "research"
  },
  {
    "id": "sourceVerifier",
    "name": "Manba tekshiruvchisi",
    "specialty": "Manbalar ishonchliligi va kelib chiqishini tekshiradi",
    "category": "research"
  },
  {
    "id": "factChecker",
    "name": "Fakt tekshiruvchi",
    "specialty": "Fakt va taxminlarni farqlaydi",
    "category": "research"
  },
  {
    "id": "scienceResearcher",
    "name": "Ilmiy tadqiqotchi",
    "specialty": "Ilmiy maqola va tadqiqotlarni tahlil qiladi",
    "category": "research"
  },
  {
    "id": "newsAnalyst",
    "name": "Yangilik tahlilchisi",
    "specialty": "Yangiliklar va voqealarni kontekstda tahlil qiladi",
    "category": "research"
  },
  {
    "id": "comparisonAnalyst",
    "name": "Taqqoslash mutaxassisi",
    "specialty": "Variantlar va mahsulotlarni mezonlar asosida solishtiradi",
    "category": "research"
  },
  {
    "id": "trendAnalyst",
    "name": "Trend tahlilchisi",
    "specialty": "O‘zgarishlar va tendensiyalarni aniqlaydi",
    "category": "research"
  },
  {
    "id": "dataCollector",
    "name": "Ma’lumot yig‘uvchi",
    "specialty": "Tegishli ma’lumotlarni tartibli to‘playdi",
    "category": "research"
  },
  {
    "id": "citationWriter",
    "name": "Manba qayd etuvchi",
    "specialty": "Dalillarni manbalarga bog‘laydi",
    "category": "research"
  },
  {
    "id": "researchSummarizer",
    "name": "Tadqiqot xulosachisi",
    "specialty": "Topilgan ma’lumotlarni qisqa xulosaga aylantiradi",
    "category": "research"
  },
  {
    "id": "pythonEngineer",
    "name": "Python mutaxassisi",
    "specialty": "Python kodini yozish va tahlil qilish",
    "category": "coding"
  },
  {
    "id": "javascriptEngineer",
    "name": "JavaScript mutaxassisi",
    "specialty": "JavaScript va Node.js yechimlari",
    "category": "coding"
  },
  {
    "id": "typescriptEngineer",
    "name": "TypeScript mutaxassisi",
    "specialty": "TypeScript tiplar va kod arxitekturasi",
    "category": "coding"
  },
  {
    "id": "frontendEngineer",
    "name": "Frontend dasturchi",
    "specialty": "Web interfeys va frontend kod",
    "category": "coding"
  },
  {
    "id": "backendEngineer",
    "name": "Backend dasturchi",
    "specialty": "Server va backend mantiq",
    "category": "coding"
  },
  {
    "id": "apiEngineer",
    "name": "API muhandisi",
    "specialty": "API loyihalash va integratsiya",
    "category": "coding"
  },
  {
    "id": "androidEngineer",
    "name": "Android dasturchi",
    "specialty": "Android ilovalar va mobil integratsiya",
    "category": "coding"
  },
  {
    "id": "kotlinEngineer",
    "name": "Kotlin mutaxassisi",
    "specialty": "Kotlin kod va Android yechimlari",
    "category": "coding"
  },
  {
    "id": "databaseEngineer",
    "name": "Ma’lumotlar bazasi muhandisi",
    "specialty": "DB sxema, so‘rovlar va saqlash",
    "category": "coding"
  },
  {
    "id": "algorithmEngineer",
    "name": "Algoritm mutaxassisi",
    "specialty": "Algoritm va samaradorlik",
    "category": "coding"
  },
  {
    "id": "architectureEngineer",
    "name": "Dastur arxitektori",
    "specialty": "Modullar va tizim arxitekturasini loyihalash",
    "category": "coding"
  },
  {
    "id": "uiEngineer",
    "name": "UI mutaxassisi",
    "specialty": "Foydalanuvchi interfeysi va komponentlar",
    "category": "coding"
  },
  {
    "id": "cssEngineer",
    "name": "CSS mutaxassisi",
    "specialty": "CSS, layout va responsive ko‘rinish",
    "category": "coding"
  },
  {
    "id": "integrationEngineer",
    "name": "Integratsiya muhandisi",
    "specialty": "Tizimlararo integratsiya va protokollar",
    "category": "coding"
  },
  {
    "id": "bugFixEngineer",
    "name": "Xato tuzatuvchi",
    "specialty": "Kod xatolarini tahlil va tuzatish takliflari",
    "category": "coding"
  },
  {
    "id": "testEngineer",
    "name": "Test muhandisi",
    "specialty": "Test holatlari va test qamrovi",
    "category": "quality"
  },
  {
    "id": "qaReviewer",
    "name": "QA tekshiruvchi",
    "specialty": "Talablar bo‘yicha sifat tekshiruvi",
    "category": "quality"
  },
  {
    "id": "securityAuditor",
    "name": "Xavfsizlik auditori",
    "specialty": "Xavfsizlik zaifliklarini aniqlash",
    "category": "quality"
  },
  {
    "id": "codeReviewer",
    "name": "Kod reviewer",
    "specialty": "Kod o‘qilishi, xatolar va maintainability",
    "category": "quality"
  },
  {
    "id": "regressionTester",
    "name": "Regressiya tester",
    "specialty": "Oldingi funksiyalar buzilmaganini tekshiradi",
    "category": "quality"
  },
  {
    "id": "performanceTester",
    "name": "Performance tester",
    "specialty": "Tezlik va resurs sarfini tahlil qiladi",
    "category": "quality"
  },
  {
    "id": "apiTester",
    "name": "API tester",
    "specialty": "API javoblari va xatolarini tekshiradi",
    "category": "quality"
  },
  {
    "id": "compatibilityTester",
    "name": "Moslik tester",
    "specialty": "Platforma va versiya mosligini tekshiradi",
    "category": "quality"
  },
  {
    "id": "reliabilityEngineer",
    "name": "Ishonchlilik muhandisi",
    "specialty": "Barqarorlik va uzluksizlikni tahlil qiladi",
    "category": "quality"
  },
  {
    "id": "errorInvestigator",
    "name": "Xato tergovchisi",
    "specialty": "Log va xato belgilaridan sabab izlaydi",
    "category": "quality"
  },
  {
    "id": "releaseAuditor",
    "name": "Reliz tekshiruvchisi",
    "specialty": "Reliz xavflari va tayyorligini tekshiradi",
    "category": "quality"
  },
  {
    "id": "knowledgeImporter",
    "name": "Bilim importeri",
    "specialty": "ZIP va fayllarni bilim tizimiga qabul qilishni rejalaydi",
    "category": "knowledge"
  },
  {
    "id": "knowledgeCurator",
    "name": "Bilim kuratori",
    "specialty": "Bilimlarni mavzu va sifat bo‘yicha saralaydi",
    "category": "knowledge"
  },
  {
    "id": "knowledgeIndexer",
    "name": "Bilim indekslovchi",
    "specialty": "Qidiruv indekslari va metadata tuzilmasi",
    "category": "knowledge"
  },
  {
    "id": "memoryManager",
    "name": "Xotira boshqaruvchisi",
    "specialty": "Xotira yozuvlari va kontekstni tartiblaydi",
    "category": "knowledge"
  },
  {
    "id": "knowledgeDeduplicator",
    "name": "Takror tozalovchi",
    "specialty": "Takror bilimlarni aniqlaydi",
    "category": "knowledge"
  },
  {
    "id": "knowledgeVerifier",
    "name": "Bilim tekshiruvchi",
    "specialty": "Bilimlarning dolzarbligi va aniqligini tekshiradi",
    "category": "knowledge"
  },
  {
    "id": "knowledgeRetriever",
    "name": "Bilim qidiruvchi",
    "specialty": "Savolga mos bilimlarni topish strategiyasi",
    "category": "knowledge"
  },
  {
    "id": "archiveManager",
    "name": "Arxiv boshqaruvchisi",
    "specialty": "Versiyalar va arxiv tuzilmasi",
    "category": "knowledge"
  },
  {
    "id": "metadataAnalyst",
    "name": "Metadata mutaxassisi",
    "specialty": "Fayl metadata va tasnifini tahlil qiladi",
    "category": "knowledge"
  },
  {
    "id": "knowledgeSynthesizer",
    "name": "Bilim sintezatori",
    "specialty": "Turli bilimlardan umumlashtirilgan xulosa chiqaradi",
    "category": "knowledge"
  },
  {
    "id": "uzbekLanguageAgent",
    "name": "O‘zbek tili mutaxassisi",
    "specialty": "O‘zbekcha matn va terminlar",
    "category": "language"
  },
  {
    "id": "englishLanguageAgent",
    "name": "Ingliz tili mutaxassisi",
    "specialty": "Ingliz tili va matn sifatini tahlil qiladi",
    "category": "language"
  },
  {
    "id": "russianLanguageAgent",
    "name": "Rus tili mutaxassisi",
    "specialty": "Rus tili va matn sifatini tahlil qiladi",
    "category": "language"
  },
  {
    "id": "translator",
    "name": "Tarjimon",
    "specialty": "Mazmunni tillar orasida tarjima qiladi",
    "category": "language"
  },
  {
    "id": "grammarChecker",
    "name": "Grammatika tekshiruvchi",
    "specialty": "Imlo va grammatika xatolarini aniqlaydi",
    "category": "language"
  },
  {
    "id": "terminologyAgent",
    "name": "Terminolog",
    "specialty": "Texnik terminlarni bir xil qo‘llashni nazorat qiladi",
    "category": "language"
  },
  {
    "id": "localizationAgent",
    "name": "Lokalizatsiya mutaxassisi",
    "specialty": "Matn va interfeysni til-madaniyatga moslashtiradi",
    "category": "language"
  },
  {
    "id": "meaningVerifier",
    "name": "Ma’no tekshiruvchi",
    "specialty": "Tarjima mazmuni o‘zgarmaganini tekshiradi",
    "category": "language"
  },
  {
    "id": "writingEditor",
    "name": "Matn muharriri",
    "specialty": "Matnni ravon va aniq qiladi",
    "category": "language"
  },
  {
    "id": "speechTextAgent",
    "name": "Nutq-matn mutaxassisi",
    "specialty": "Ovozli matn uchun yozuvni optimallashtiradi",
    "category": "language"
  },
  {
    "id": "businessPlanner",
    "name": "Biznes rejalashtiruvchi",
    "specialty": "Biznes modeli va rejani ishlab chiqadi",
    "category": "business"
  },
  {
    "id": "marketAnalyst",
    "name": "Bozor tahlilchisi",
    "specialty": "Bozor hajmi va talabni o‘rganadi",
    "category": "business"
  },
  {
    "id": "marketingAgent",
    "name": "Marketing mutaxassisi",
    "specialty": "Marketing strategiyasi va kampaniyalar",
    "category": "business"
  },
  {
    "id": "salesAdvisor",
    "name": "Savdo maslahatchisi",
    "specialty": "Savdo jarayoni va takliflarni yaxshilaydi",
    "category": "business"
  },
  {
    "id": "customerAnalyst",
    "name": "Mijoz tahlilchisi",
    "specialty": "Mijoz ehtiyojlari va segmentlarini tahlil qiladi",
    "category": "business"
  },
  {
    "id": "financeAnalyst",
    "name": "Moliyaviy tahlilchi",
    "specialty": "Xarajat, daromad va byudjet hisoblari",
    "category": "business"
  },
  {
    "id": "pricingAdvisor",
    "name": "Narx mutaxassisi",
    "specialty": "Narx va paketlarni tahlil qiladi",
    "category": "business"
  },
  {
    "id": "productManager",
    "name": "Mahsulot menejeri",
    "specialty": "Mahsulot talab va rivojlanish yo‘li",
    "category": "business"
  },
  {
    "id": "startupAdvisor",
    "name": "Startap maslahatchisi",
    "specialty": "Startap strategiyasi va MVP",
    "category": "business"
  },
  {
    "id": "operationsAnalyst",
    "name": "Operatsion tahlilchi",
    "specialty": "Jarayon va operatsion samaradorlik",
    "category": "business"
  },
  {
    "id": "documentWriter",
    "name": "Hujjat yozuvchi",
    "specialty": "Hujjat va hisobot matnlarini tayyorlaydi",
    "category": "documents"
  },
  {
    "id": "pdfSpecialist",
    "name": "PDF mutaxassisi",
    "specialty": "PDF tuzilmasi va kontentni tahlil qilish",
    "category": "documents"
  },
  {
    "id": "wordSpecialist",
    "name": "Word mutaxassisi",
    "specialty": "DOCX matn va formatlash",
    "category": "documents"
  },
  {
    "id": "spreadsheetAnalyst",
    "name": "Excel mutaxassisi",
    "specialty": "Jadval, formula va spreadsheet tahlili",
    "category": "documents"
  },
  {
    "id": "presentationDesigner",
    "name": "Taqdimot dizayneri",
    "specialty": "Slayd tuzilmasi va hikoya oqimi",
    "category": "documents"
  },
  {
    "id": "resumeAdvisor",
    "name": "Rezyume mutaxassisi",
    "specialty": "CV va ishga topshirish hujjatlari",
    "category": "documents"
  },
  {
    "id": "reportWriter",
    "name": "Hisobot yozuvchi",
    "specialty": "Tahliliy hisobotlar",
    "category": "documents"
  },
  {
    "id": "proofreader",
    "name": "Korrektor",
    "specialty": "Imlo va format tekshiruv",
    "category": "documents"
  },
  {
    "id": "formAssistant",
    "name": "Forma yordamchisi",
    "specialty": "Ariza va formalarni to‘ldirishga ko‘mak",
    "category": "documents"
  },
  {
    "id": "documentVerifier",
    "name": "Hujjat tekshiruvchi",
    "specialty": "Hujjat to‘liqligi va talablar tekshiruvi",
    "category": "documents"
  },
  {
    "id": "ideaGenerator",
    "name": "G‘oya yaratuvchi",
    "specialty": "Yangi g‘oya va yechimlar ishlab chiqadi",
    "category": "innovation"
  },
  {
    "id": "creativeWriter",
    "name": "Ijodiy yozuvchi",
    "specialty": "Ijodiy matn va ssenariylar",
    "category": "innovation"
  },
  {
    "id": "designAdvisor",
    "name": "Dizayn maslahatchisi",
    "specialty": "Dizayn g‘oyalari va vizual konsepsiyalar",
    "category": "innovation"
  },
  {
    "id": "productInnovator",
    "name": "Mahsulot innovatori",
    "specialty": "Mahsulotni yaxshilash takliflari",
    "category": "innovation"
  },
  {
    "id": "automationDesigner",
    "name": "Avtomatlashtirish dizayneri",
    "specialty": "Takroriy ishlarni avtomatlashtirish",
    "category": "innovation"
  },
  {
    "id": "workflowInnovator",
    "name": "Jarayon innovatori",
    "specialty": "Ish oqimini soddalashtirish",
    "category": "innovation"
  },
  {
    "id": "prototypePlanner",
    "name": "Prototip rejalashtiruvchi",
    "specialty": "MVP va prototip rejasi",
    "category": "innovation"
  },
  {
    "id": "uxResearcher",
    "name": "UX tadqiqotchi",
    "specialty": "Foydalanuvchi tajribasi tahlili",
    "category": "innovation"
  },
  {
    "id": "contentStrategist",
    "name": "Kontent strateg",
    "specialty": "Kontent yo‘nalishi va rejalari",
    "category": "innovation"
  },
  {
    "id": "solutionArchitect",
    "name": "Yechim arxitektori",
    "specialty": "Muammoga end-to-end yechim taklif qiladi",
    "category": "innovation"
  },
  {
    "id": "functionMonitor",
    "name": "Funksiya monitoringi",
    "specialty": "Funksiyalar holati va nosozlik belgilarini tahlil qiladi",
    "category": "recovery"
  },
  {
    "id": "incidentDiagnostician",
    "name": "Avariya diagnostikasi",
    "specialty": "Server va xizmatdagi avariya sabablarini izlaydi",
    "category": "recovery"
  },
  {
    "id": "repairPlanner",
    "name": "Tiklash rejalashtiruvchisi",
    "specialty": "Xavfsiz tiklash bosqichlarini taklif qiladi",
    "category": "recovery"
  },
  {
    "id": "dependencyAuditor",
    "name": "Bog‘liqlik auditori",
    "specialty": "Paket va dependency muammolarini tahlil qiladi",
    "category": "recovery"
  },
  {
    "id": "configAuditor",
    "name": "Konfiguratsiya auditori",
    "specialty": "Konfiguratsiya xatolari va sozlamalarni tekshiradi",
    "category": "recovery"
  },
  {
    "id": "renderMonitor",
    "name": "Render nazoratchisi",
    "specialty": "Render deploy, log va health holatlarini tahlil qiladi",
    "category": "recovery"
  },
  {
    "id": "githubMonitor",
    "name": "GitHub nazoratchisi",
    "specialty": "Repo, commit va CI holatlarini tahlil qiladi",
    "category": "recovery"
  },
  {
    "id": "backupPlanner",
    "name": "Zaxira rejalashtiruvchi",
    "specialty": "Backup va qayta tiklash rejasi",
    "category": "recovery"
  },
  {
    "id": "resourceOptimizer",
    "name": "Resurs optimizatori",
    "specialty": "RAM, CPU, concurrency va xarajatni optimallashtiradi",
    "category": "recovery"
  },
  {
    "id": "selfImprovementAuditor",
    "name": "O‘zini yaxshilash auditori",
    "specialty": "Takliflarni baholaydi, xavfsiz test va regressiya mezonlarini belgilaydi",
    "category": "recovery"
  }
];
const KEYWORDS = {
 research: /internet|qidir|izla|manba|tadqiq|yangilik|ilmiy|dalil|havola/i,
 coding: /kod|dastur|program|python|javascript|typescript|api|server|github|android|apk|sayt|frontend|backend/i,
 quality: /xato|yiqil|ishlam|tekshir|test|bug|nosoz|buzil|sifat|xavfsiz/i,
 knowledge: /zip|bilim|o.rgan|xotira|knowledge|arxiv|indeks|ma.lumot saqla/i,
 language: /tarjima|o.zbek|ingliz|rus|til|grammatika|matn/i,
 business: /biznes|savdo|marketing|mijoz|bozor|daromad|startup|startap/i,
 documents: /pdf|word|excel|xlsx|docx|hujjat|hisobot|rezyume|taqdimot/i,
 innovation: /g.oya|yarat|dizayn|avtomatlashtir|prototip|mahsulot|innovats/i,
 recovery: /server|render|deploy|tikla|restore|health|log|funksiya|nosoz|yiqil|xato/i
};
function selectForTask(task, limit=6) {
 const text=String(task||"").toLowerCase();
 const categories=Object.keys(KEYWORDS).filter(category=>KEYWORDS[category].test(text));
 const chosen=[];
 const add=(id)=>{const agent=AGENTS.find(item=>item.id===id);if(agent&&!chosen.includes(agent))chosen.push(agent);};
 add("orchestrator");
 for(const category of categories){
  const candidates=AGENTS.filter(agent=>agent.category===category);
  if(candidates.length){const seed=categories.indexOf(category);add(candidates[seed % candidates.length].id);}
 }
 add("qualityCoordinator"); add("factChecker");
 return chosen.slice(0,Math.max(1,Math.min(10,Number(limit)||6)));
}
function getAgent(id){return AGENTS.find(agent=>agent.id===id)||null;}
function listAgents(){return AGENTS.map(agent=>({...agent}));}
function status(){return {ok:true,totalAgents:AGENTS.length,profilesReady:true,activeModelProcesses:0,architecture:"100-role catalog with bounded ephemeral specialist execution",categories:Object.fromEntries([...new Set(AGENTS.map(a=>a.category))].map(category=>[category,AGENTS.filter(a=>a.category===category).length])),selection:"task keyword routing; roles are not separate model instances"};}
module.exports={AGENTS,selectForTask,getAgent,listAgents,status};