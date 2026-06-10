// Comprehensive QA review of the study guide HTML.
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'claude-architect-study-guide 2.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const lines = html.split('\n');
console.log(`File: ${htmlPath}`);
console.log(`Size: ${(html.length/1024).toFixed(1)} KB, ${lines.length} lines\n`);

const issues = [];

// =======================================================
// CATEGORY A: Style policy violations (user requirement)
// =======================================================

// A1: Em dashes (user said NEVER use them)
const emDashCount = (html.match(/—/g) || []).length;
if (emDashCount > 0) {
  // Show first 10 occurrences
  const samples = [];
  let idx = 0, count = 0;
  while ((idx = html.indexOf('—', idx)) !== -1 && count < 10) {
    const lineNum = html.slice(0, idx).split('\n').length;
    samples.push(`L${lineNum}: ...${html.slice(Math.max(0,idx-30), idx+30)}...`);
    idx++;
    count++;
  }
  issues.push({sev: 'HIGH', cat: 'STYLE', msg: `${emDashCount} em-dashes found (user requirement: never use them)`, samples});
}

// A2: En dashes (less critical but might be in numeric ranges)
const enDashCount = (html.match(/–/g) || []).length;
if (enDashCount > 0) {
  issues.push({sev: 'LOW', cat: 'STYLE', msg: `${enDashCount} en-dashes (common in numeric ranges; ok if intentional)`});
}

// A3: Smart quotes that should be regular
const smartQuoteCount = (html.match(/[“”‘’]/g) || []).length;
if (smartQuoteCount > 5) {
  issues.push({sev: 'MED', cat: 'STYLE', msg: `${smartQuoteCount} smart quotes (may break JS strings if inside literals)`});
}

// =======================================================
// CATEGORY B: JS/HTML structural integrity
// =======================================================

// B1: Element IDs referenced in JS but not present in HTML
const jsRefs = new Set();
const idRefRegex = /getElementById\(['"]([^'"]+)['"]\)|querySelector\(['"]#([^'"]+)['"]\)/g;
let m;
while ((m = idRefRegex.exec(html)) !== null) jsRefs.add(m[1] || m[2]);

const definedIds = new Set();
const idDefRegex = /\bid="([^"]+)"/g;
while ((m = idDefRegex.exec(html)) !== null) definedIds.add(m[1]);

const missingIds = [...jsRefs].filter(id => !definedIds.has(id) && !id.startsWith('q-') && !id.startsWith('expl-') && !id.startsWith('fc-') && id !== 'crash-search');
if (missingIds.length > 0) {
  issues.push({sev: 'HIGH', cat: 'JS', msg: `JS references missing IDs: ${missingIds.join(', ')}`});
}

// B2: Duplicate IDs
const idCounts = {};
let m2;
const idRegex2 = /\bid="([^"]+)"/g;
while ((m2 = idRegex2.exec(html)) !== null) {
  idCounts[m2[1]] = (idCounts[m2[1]] || 0) + 1;
}
const dupIds = Object.entries(idCounts).filter(([id,c]) => c > 1);
if (dupIds.length > 0) {
  issues.push({sev: 'HIGH', cat: 'HTML', msg: `Duplicate IDs: ${dupIds.map(([id,c])=>`${id}(${c}x)`).join(', ')}`});
}

// B3: <script> opening/closing balance
const openScripts = (html.match(/<script\b[^>]*>/g) || []).length;
const closeScripts = (html.match(/<\/script>/g) || []).length;
if (openScripts !== closeScripts) {
  issues.push({sev: 'HIGH', cat: 'HTML', msg: `script tags imbalance: ${openScripts} open vs ${closeScripts} close`});
}

// B4: Try to evaluate the data arrays
const grab = (start, end) => {
  const s = html.indexOf(start);
  if (s < 0) return null;
  const e = html.indexOf(end, s);
  if (e < 0) return null;
  try {
    return (new Function('return [' + html.slice(s + start.length, e) + ']'))();
  } catch (err) {
    issues.push({sev: 'HIGH', cat: 'JS', msg: `Failed to parse ${start.split('=')[0].trim()}: ${err.message}`});
    return null;
  }
};

const examQs = grab('const examQs = [', '];');
const qaBankExtra = grab('const qaBankExtra = [', '];');
const crashRows = grab('const crashRows = [', '];');
const allCards = grab('const allCards = [', '];');

console.log(`Data arrays loaded:`);
console.log(`  allCards: ${allCards?.length || 'FAIL'}`);
console.log(`  examQs: ${examQs?.length || 'FAIL'}`);
console.log(`  qaBankExtra: ${qaBankExtra?.length || 'FAIL'}`);
console.log(`  crashRows: ${crashRows?.length || 'FAIL'}`);

// =======================================================
// CATEGORY C: Data quality
// =======================================================

if (examQs && qaBankExtra) {
  const qaBank = examQs.concat(qaBankExtra);
  const seenQ = new Map();
  let dupeCount = 0;
  const dupeContradictions = [];
  for (const e of qaBank) {
    const k = e.q.toLowerCase().replace(/\s+/g,' ').trim();
    if (seenQ.has(k)) {
      dupeCount++;
      const prev = seenQ.get(k);
      if (prev.correct !== e.correct) {
        dupeContradictions.push({q: e.q.slice(0,80), prev: prev.correct, curr: e.correct});
      }
    } else {
      seenQ.set(k, e);
    }
  }
  if (dupeCount > 0) issues.push({sev: 'MED', cat: 'DATA', msg: `${dupeCount} duplicate questions in qaBank (may be ok if intentional)`});
  if (dupeContradictions.length > 0) issues.push({sev: 'HIGH', cat: 'DATA', msg: `${dupeContradictions.length} duplicate Qs with DIFFERENT correct answers`, samples: dupeContradictions.slice(0,5)});

  // Check domain values
  const validDomains = new Set(['d1','d2','d3','d4','d5']);
  const badDom = qaBank.filter(e => !validDomains.has(e.domain));
  if (badDom.length > 0) issues.push({sev: 'HIGH', cat: 'DATA', msg: `${badDom.length} entries with invalid domain values`});

  // Domain distribution
  const dist = {d1:0,d2:0,d3:0,d4:0,d5:0};
  for (const e of qaBank) dist[e.domain] = (dist[e.domain]||0)+1;
  const total = qaBank.length;
  console.log(`\nQ&A Bank domain distribution (target weights: d1=27%, d2=18%, d3=20%, d4=20%, d5=15%):`);
  for (const [d, c] of Object.entries(dist)) {
    console.log(`  ${d}: ${c} (${(c/total*100).toFixed(1)}%)`);
  }
}

// Flashcard duplicates
if (allCards) {
  const seenCard = new Map();
  let cardDupes = 0;
  for (const c of allCards) {
    const k = c.q.toLowerCase().replace(/\s+/g,' ').trim();
    if (seenCard.has(k)) cardDupes++;
    else seenCard.set(k, c);
  }
  if (cardDupes > 0) issues.push({sev: 'LOW', cat: 'DATA', msg: `${cardDupes} duplicate flashcards`});
}

// Crash row duplicates
if (crashRows) {
  const seenCrash = new Map();
  let crashDupes = 0;
  for (const c of crashRows) {
    const k = (c.key + '|' + c.section).toLowerCase();
    if (seenCrash.has(k)) crashDupes++;
    else seenCrash.set(k, c);
  }
  if (crashDupes > 0) issues.push({sev: 'LOW', cat: 'DATA', msg: `${crashDupes} duplicate crash rows`});
}

// =======================================================
// CATEGORY D: Cross-tab terminology consistency
// =======================================================

// Check whether key facts appear consistently
const factChecks = [
  { fact: 'Memory tool type string', pattern: /memory_20250818/g },
  { fact: 'Compaction beta header', pattern: /compact-2026-01-12/g },
  { fact: 'Files API beta', pattern: /files-api-2025-04-14/g },
  { fact: '256 MB batch limit', pattern: /256\s*MB/gi },
  { fact: '100,000 batch requests', pattern: /100[,.]?000\s*(?:requests|messages)/gi },
  { fact: '24-hour batch expiry', pattern: /24[\s-]hour/gi },
  { fact: 'Task→Agent rename', pattern: /v2\.1\.63/g },
];
console.log(`\nFact occurrence audit (should appear multiple places consistently):`);
for (const {fact, pattern} of factChecks) {
  const count = (html.match(pattern) || []).length;
  console.log(`  ${count}× ${fact}`);
}

// =======================================================
// CATEGORY E: HTML entity / encoding issues
// =======================================================

// Look for unrendered HTML entities inside JS string contexts (would show up as literal text)
const entityInJs = [];
if (qaBankExtra?.length) {
  const sample = qaBankExtra.slice(0, 200);
  for (const e of sample) {
    const text = e.q + e.opts.join('|') + e.explain;
    if (/&[a-z]+;/.test(text)) {
      // Some are intentional (in code blocks, <example> demos), but many aren't
      const matches = text.match(/&[a-z]+;/g) || [];
      const concerning = matches.filter(x => !['&amp;','&lt;','&gt;','&quot;','&apos;','&nbsp;'].includes(x));
      if (concerning.length > 0) entityInJs.push({q: e.q.slice(0,60), entities: concerning.slice(0,5)});
    }
  }
}
if (entityInJs.length > 0) {
  issues.push({sev: 'LOW', cat: 'CONTENT', msg: `Entries with HTML entities in plain text fields (will render literally)`, samples: entityInJs.slice(0,3)});
}

// =======================================================
// CATEGORY F: Length / readability
// =======================================================

// Find very long option strings (might wrap awkwardly)
if (qaBankExtra) {
  const longOpts = [];
  for (const e of qaBankExtra) {
    const maxOpt = Math.max(...e.opts.map(o => o.length));
    if (maxOpt > 350) longOpts.push({q: e.q.slice(0,50), maxLen: maxOpt});
  }
  if (longOpts.length > 0) issues.push({sev: 'LOW', cat: 'READ', msg: `${longOpts.length} questions have option > 350 chars (display may wrap awkwardly)`, samples: longOpts.slice(0,3)});
}

// =======================================================
// CATEGORY G: Tab definitions match
// =======================================================

// Tab buttons
const tabBtns = [...html.matchAll(/showSection\('([^']+)'\)/g)].map(m => m[1]);
const uniqueTabs = [...new Set(tabBtns)];
console.log(`\nTabs declared: ${uniqueTabs.join(', ')}`);
for (const tabId of uniqueTabs) {
  const re = new RegExp('id="' + tabId + '"\\s+class="section');
  if (!re.test(html)) issues.push({sev: 'HIGH', cat: 'HTML', msg: `Tab references '${tabId}' but no <div id="${tabId}" class="section">`});
}

// =======================================================
// REPORT
// =======================================================

console.log(`\n=== ${issues.length} issues found ===`);
const bySev = {};
for (const i of issues) bySev[i.sev] = (bySev[i.sev]||0)+1;
console.log('By severity:', bySev);

console.log('\n--- DETAILS ---');
for (const i of issues) {
  console.log(`\n[${i.sev}/${i.cat}] ${i.msg}`);
  if (i.samples) {
    for (const s of i.samples) {
      if (typeof s === 'string') console.log(`  ${s}`);
      else console.log(`  ${JSON.stringify(s).slice(0,200)}`);
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'qa_review_issues.json'), JSON.stringify(issues, null, 2));
console.log('\nFull report: qa_review_issues.json');
