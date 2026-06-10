// Cross-check: do Quick Review crash-rows cover the topics tested in the Q&A bank?
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'claude-architect-study-guide 2.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// --- Extract qaBank (examQs + qaBankExtra) ---
const examStart = html.indexOf('const examQs = [');
const examEnd = html.indexOf('];', examStart);
const examQs = (new Function('return [' + html.slice(examStart + 'const examQs = ['.length, examEnd) + ']'))();

const extraStart = html.indexOf('const qaBankExtra = [');
const extraEnd = html.indexOf('];', extraStart);
const qaBankExtra = (new Function('return [' + html.slice(extraStart + 'const qaBankExtra = ['.length, extraEnd) + ']'))();

const qaBank = examQs.concat(qaBankExtra);

// --- Extract crashRows (Quick Review) ---
const crashStart = html.indexOf('const crashRows = [');
const crashEnd = html.indexOf('];\n', crashStart);
const crashRows = (new Function('return [' + html.slice(crashStart + 'const crashRows = ['.length, crashEnd) + ']'))();

console.log(`Loaded: ${qaBank.length} Q&A, ${crashRows.length} Quick Review rows\n`);

// --- Token extraction: distinctive technical terms ---
function extractTokens(text) {
  const tokens = new Set();
  if (!text) return tokens;

  // 1. snake_case / kebab-case identifiers (containing _ or - and at least one letter)
  for (const m of text.matchAll(/\b([a-z][a-zA-Z]*[_-][a-zA-Z_-]+[a-zA-Z0-9]?)\b/g)) {
    if (m[1].length >= 4) tokens.add(m[1].toLowerCase());
  }
  // 2. CamelCase (PreToolUse, AgentDefinition, ResultMessage, etc.)
  for (const m of text.matchAll(/\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g)) {
    tokens.add(m[1].toLowerCase());
  }
  // 3. file paths and urls with .json/.md extensions or claude
  for (const m of text.matchAll(/\b((?:claude\.|\.claude|claude_)\S*?)(?=[\s,.;:'"]|$)/gi)) {
    tokens.add(m[1].toLowerCase().replace(/[<>]/g, ''));
  }
  // 4. Specific identifiers in backticks or code tags
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    if (m[1].length < 60) tokens.add(m[1].toLowerCase().trim());
  }
  for (const m of text.matchAll(/<code>([^<]+)<\/code>/g)) {
    if (m[1].length < 60) tokens.add(m[1].toLowerCase().trim());
  }
  // 5. Numeric specifics (with unit)
  for (const m of text.matchAll(/\b(\d{2,}\s*(?:tokens?|requests?|MB|GB|KB|chars?|breakpoints?|days?|hours?|iter(?:ation)?s?|minutes?))\b/gi)) {
    tokens.add(m[1].toLowerCase().replace(/\s+/g, ' '));
  }
  // 6. Beta header style strings
  for (const m of text.matchAll(/\b([a-z][a-z-]+-\d{4}-\d{2}-\d{2})\b/g)) {
    tokens.add(m[1].toLowerCase());
  }
  // 7. Distinctive concept phrases
  const conceptPhrases = [
    'lost in the middle', 'prompt chaining', 'orchestrator-workers', 'evaluator-optimizer',
    'just-in-time retrieval', 'structured note-taking', 'sub-agent isolation',
    'context degradation', 'context engineering', 'agent-computer interface',
    'fork session', 'plan mode', 'direct execution', 'permission mode',
    'auto memory', 'context fork', 'plugin manifest', 'hub-and-spoke',
    'forced tool', 'few-shot', 'multishot', 'extended thinking', 'adaptive thinking',
    'prompt caching', 'cache breakpoint', 'compaction', 'context window',
    'session resumption', 'self-review', 'multi-pass review', 'parallel tool',
    'schema redundancy', 'resilient enum', 'validation retry', 'error propagation',
    'escalation trigger', 'confidence calibration', 'provenance', 'source attribution'
  ];
  const lower = text.toLowerCase();
  for (const phrase of conceptPhrases) {
    if (lower.includes(phrase)) tokens.add(phrase);
  }

  // Filter out common/noise tokens
  const noise = new Set([
    'true', 'false', 'null', 'string', 'number', 'array', 'object',
    'opt 0', 'opt 1', 'opt 2', 'opt 3', 'opts', 'correct', 'q', 'a',
    'd1', 'd2', 'd3', 'd4', 'd5', 'pb', 'ref',
    'a)', 'b)', 'c)', 'd)', 'i.e.', 'e.g.',
  ]);
  for (const n of noise) tokens.delete(n);

  return tokens;
}

// --- Build crashRow concept set ---
const crashTokens = new Set();
const crashTokenSources = {}; // token -> [section names]
for (const row of crashRows) {
  const tokens = extractTokens(row.key + ' ' + row.val + ' ' + (row.section || ''));
  for (const t of tokens) {
    crashTokens.add(t);
    if (!crashTokenSources[t]) crashTokenSources[t] = [];
    crashTokenSources[t].push(row.key);
  }
}
console.log(`Quick Review covers ${crashTokens.size} distinct tokens/concepts\n`);

// --- For each exam question, compute coverage ---
const coverageStats = qaBank.map((q, idx) => {
  const fullText = q.q + ' ' + q.opts.join(' ') + ' ' + (q.explain || '');
  const qTokens = extractTokens(fullText);
  const covered = new Set();
  const uncovered = new Set();
  for (const t of qTokens) {
    if (crashTokens.has(t)) covered.add(t);
    else uncovered.add(t);
  }
  return {
    idx,
    domain: q.domain,
    q: q.q.slice(0, 80),
    totalTokens: qTokens.size,
    coveredCount: covered.size,
    uncoveredCount: uncovered.size,
    coveragePct: qTokens.size === 0 ? 1 : covered.size / qTokens.size,
    uncoveredSamples: [...uncovered].slice(0, 8)
  };
});

// --- Distribution ---
let zeroTok = 0, fullCov = 0, lowCov = 0, midCov = 0, highCov = 0;
const buckets = {'0%-25%':0, '25%-50%':0, '50%-75%':0, '75%-100%':0};
for (const c of coverageStats) {
  if (c.totalTokens === 0) zeroTok++;
  else if (c.coveragePct === 1) fullCov++;
  if (c.coveragePct < 0.25) buckets['0%-25%']++;
  else if (c.coveragePct < 0.5) buckets['25%-50%']++;
  else if (c.coveragePct < 0.75) buckets['50%-75%']++;
  else buckets['75%-100%']++;
}

console.log('=== Coverage Distribution ===');
console.log('Zero tokens (concept-only Q):', zeroTok);
console.log('100% covered:', fullCov);
console.log('By bucket:', buckets);

// Average coverage
const avg = coverageStats.reduce((s, c) => s + c.coveragePct, 0) / coverageStats.length;
console.log(`Average coverage: ${(avg*100).toFixed(1)}%`);

// Per-domain coverage
const perDom = {d1:[], d2:[], d3:[], d4:[], d5:[]};
for (const c of coverageStats) perDom[c.domain].push(c.coveragePct);
console.log('\nPer-domain average coverage:');
for (const [d, arr] of Object.entries(perDom)) {
  const a = arr.reduce((s,v)=>s+v,0) / arr.length;
  console.log(`  ${d}: ${(a*100).toFixed(1)}% (${arr.length} questions)`);
}

// --- Find LOWEST coverage questions (potential gaps) ---
const sorted = coverageStats
  .filter(c => c.totalTokens >= 3)  // ignore questions with too few tokens
  .sort((a, b) => a.coveragePct - b.coveragePct);

console.log('\n=== 15 Lowest-Coverage Questions (potential gaps) ===');
for (const c of sorted.slice(0, 15)) {
  console.log(`\n[${c.domain}] ${c.q}`);
  console.log(`  Coverage: ${(c.coveragePct*100).toFixed(0)}% (${c.coveredCount}/${c.totalTokens})`);
  console.log(`  Uncovered: ${c.uncoveredSamples.join(', ')}`);
}

// --- Find frequently-missed tokens (gaps in Quick Review) ---
const missedTokenFreq = {};
for (const c of coverageStats) {
  for (const t of c.uncoveredSamples) {
    missedTokenFreq[t] = (missedTokenFreq[t] || 0) + 1;
  }
}
const topMissed = Object.entries(missedTokenFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);
console.log('\n=== Top 30 missed tokens (concepts in exam but NOT in Quick Review) ===');
for (const [t, count] of topMissed) {
  console.log(`  ${count}x: ${t}`);
}

// Save full report
fs.writeFileSync(path.join(__dirname, 'coverage_report.json'), JSON.stringify({
  totalQuestions: qaBank.length,
  totalCrashRows: crashRows.length,
  averageCoverage: avg,
  perDomain: Object.fromEntries(Object.entries(perDom).map(([d,a]) => [d, a.reduce((s,v)=>s+v,0)/a.length])),
  buckets,
  lowestCoverage: sorted.slice(0, 30),
  topMissedTokens: topMissed
}, null, 2));
console.log('\nFull report: coverage_report.json');
