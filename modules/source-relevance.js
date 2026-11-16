"use strict";

const STOP_WORDS = new Set((
  "ha yo'q yoq va yoki ammo lekin uchun haqida bilan bu shu u uni unga ular qanday nima qaysi qachon " +
  "ber menga kerak ayt ma'lumot ma lumot maʼlumot tushuntir tushuntirib izohla izoh " +
  "the a an and or but for about with from into on in at to of is are was were be been " +
  "what when where why how tell me explain give information facts " +
  "это как что где когда почему для про о об и или но на в из к по с со " +
  "информация расскажи объясни"
).split(/\s+/u));

const SUFFIXES = [
  "larining", "laridan", "lariga", "larning", "lardan", "larga", "larni",
  "ning", "dagi", "dan", "den", "gan", "gen", "kan", "ken", "ini", "iga",
  "ida", "idan", "lar", "lik", "chi", "cha", "si", "ni", "ga", "da", "ta", "mi", "i"
].sort((a, b) => b.length - a.length);

function normalizeToken(value) {
  let token = String(value || "").toLocaleLowerCase("uz")
    .replace(/[’‘ʼ`]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, "");
  if (token.length < 3) return "";
  for (const suffix of SUFFIXES) {
    if (token.length - suffix.length >= 3 && token.endsWith(suffix)) {
      token = token.slice(0, -suffix.length);
      break;
    }
  }
  return token;
}

function terms(value) {
  const raw = String(value || "")
    .toLocaleLowerCase("uz")
    .replace(/[’‘ʼ`]/g, "'")
    .match(/[\p{L}\p{N}]{3,}/gu) || [];
  return [...new Set(raw.map(normalizeToken)
    .filter(token => token && !STOP_WORDS.has(token)))];
}

function scoreSource(question, source) {
  const queryTerms = terms(question);
  const title = String(source?.title || "");
  const body = String(source?.snippet || source?.content || "");
  const titleTerms = new Set(terms(title));
  const bodyTerms = new Set(terms(body));
  if (!queryTerms.length) return { relevant: false, score: 0, matchedTerms: [], queryTerms: [] };

  const matchedTerms = queryTerms.filter(term => titleTerms.has(term) || bodyTerms.has(term));
  const titleMatches = queryTerms.filter(term => titleTerms.has(term));
  const phrase = queryTerms.length > 1 &&
    (title.toLocaleLowerCase("uz").includes(String(question).toLocaleLowerCase("uz")) ||
     body.toLocaleLowerCase("uz").includes(String(question).toLocaleLowerCase("uz")));
  const coverage = matchedTerms.length / queryTerms.length;
  const titleCoverage = titleMatches.length / queryTerms.length;
  const score = Math.min(1, coverage * 0.7 + titleCoverage * 0.2 + (phrase ? 0.1 : 0));
  const minimumMatches = queryTerms.length >= 4 ? 2 : 1;
  const normalizedBody = body.toLocaleLowerCase("uz").replace(/[’‘ʼ`]/g, "'");
  // For multi-word subjects, the main entity and the next subject term must
  // appear together in one sentence. A passing mention in an unrelated list
  // (e.g. "Egypt, India, Central Asia") is not enough.
  const subjectPair = queryTerms.length >= 2 ? queryTerms.slice(0, 2) : [];
  const pairInSameSentence = !subjectPair.length || normalizedBody
    .split(/[.!?\n]+/u)
    .some(sentence => {
      const sentenceTerms = new Set(terms(sentence));
      return subjectPair.every(term => sentenceTerms.has(term));
    });
  const relevant = matchedTerms.length >= minimumMatches &&
    (coverage >= 0.34 || phrase) && pairInSameSentence;
  return { relevant, score: Number(score.toFixed(3)), matchedTerms, queryTerms };
}

function filterRelevantSources(question, sources) {
  return (Array.isArray(sources) ? sources : [])
    .map(source => ({ ...source, relevance: scoreSource(question, source) }))
    .filter(source => source.relevance.relevant)
    .sort((a, b) => b.relevance.score - a.relevance.score);
}

module.exports = { terms, scoreSource, filterRelevantSources };
