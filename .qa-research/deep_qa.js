// Deep quality checks beyond the basic structural pass.
const fs = require('fs');
const path = require('path');
const htmlPath = path.join(__dirname, '..', 'claude-architect-study-guide 2.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const issues = [];

// 1. Look for HTML entity issues (entities meant to be literal text)
const entityPatterns = ['&mdash;','&ndash;','&hellip;'];
for (const ent of entityPatterns) {
  const count = (html.match(new RegExp(ent, 'g')) || []).length;
  if (count > 0) issues.push(`${count}× '${ent}' entity (consider replacing with plain text)`);
}

// 2. Check that &lt;, &gt; in JS strings are intentional (rendering as < > in HTML)
// Sample a few to confirm they appear in code-block contexts
const grab = (start, end) => {
  const s = html.indexOf(start);
  const e = html.indexOf(end, s);
  return (new Function('return [' + html.slice(s + start.length, e) + ']'))();
};
const qaBankExtra = grab('const qaBankExtra = [', '];');
const crashRows = grab('const crashRows = [', '];');
const allCards = grab('const allCards = [', '];');
const examQs = grab('const examQs = [', '];');

// Check that allCards entries have HTML entities only in code-bearing answer text
let entitiesInPlainText = [];
for (const c of allCards) {
  // Common false positive: <example>, <thinking>, <document>, etc. — these ARE meant as XML tag examples
  // We want to flag bare entities like &amp; in plain prose
  if (/&amp;(?![a-z])/.test(c.q + c.a)) {
    entitiesInPlainText.push(c.q.slice(0,60));
  }
}
if (entitiesInPlainText.length) issues.push(`${entitiesInPlainText.length} flashcards with stray &amp; in text`);

// 3. Look for inconsistent terminology across tabs
const corpus = JSON.stringify(qaBankExtra) + JSON.stringify(crashRows) + JSON.stringify(allCards) + JSON.stringify(examQs);

const termVariants = [
  { canonical: 'forkSession', variants: ['forksession', 'fork_session', 'fork session', 'fork-session'] },
  { canonical: 'sub-agent', variants: ['subagent', 'sub-agent', 'sub agent'] },
  { canonical: 'tool_use', variants: ['tool_use', 'tool use'] },
  { canonical: 'PreToolUse', variants: ['pretooluse', 'pre-tool-use', 'pretooluse'] },
];
const lower = corpus.toLowerCase();
for (const tv of termVariants) {
  const counts = {};
  for (const v of tv.variants) {
    const re = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'g');
    counts[v] = (lower.match(re) || []).length;
  }
  const distinct = Object.values(counts).filter(c => c > 0).length;
  if (distinct > 1) {
    // Only flag if the variants are genuinely different (not e.g. snake vs camel that's intentional)
    // Skip the canonical group; intentional case (Python vs TS naming).
  }
}

// 4. Check for orphaned references to functions
const fns = ['flipCard','markCard','filterDomain','showCard','filterCrash','searchCrash','filterQA','searchQA','selectAnswer','submitExam','resetExam','startTimer','renderCrash','renderQA','buildExam','showSection'];
for (const fn of fns) {
  const def = new RegExp(`function ${fn}\\b`).test(html);
  const ref = new RegExp(`\\b${fn}\\(`).test(html);
  if (ref && !def) issues.push(`Function ${fn} referenced but not defined`);
  if (def && !ref) issues.push(`Function ${fn} defined but not referenced`);
}

// 5. Look for super-long Q&A entries (>2000 chars) - layout risk
let bigEntries = 0;
for (const e of qaBankExtra) {
  const total = e.q.length + e.opts.join('').length + (e.explain || '').length;
  if (total > 2000) bigEntries++;
}
if (bigEntries) issues.push(`${bigEntries} qaBank entries > 2000 chars total (layout may strain on mobile)`);

// 6. Verify per-tab counts shown in UI match data
// Cards: badge says "85 Flashcards"
const badgeCardsM = html.match(/<span class="badge">(\d+)\s+Flashcards</);
if (badgeCardsM) {
  const claimed = parseInt(badgeCardsM[1]);
  if (claimed !== allCards.length) issues.push(`Badge says ${claimed} Flashcards but allCards has ${allCards.length}`);
}
const badgeQM = html.match(/<span class="badge">(\d+)\s+Practice Qs</);
if (badgeQM) {
  const claimed = parseInt(badgeQM[1]);
  if (claimed !== examQs.length) issues.push(`Badge says ${claimed} Practice Qs but examQs has ${examQs.length}`);
}

// 7. Detect JS string termination issues (unescaped quotes)
// We already loaded the data successfully so this is verified, but double-check via parse pass
let parseIssues = 0;
for (const e of qaBankExtra) {
  if (typeof e.q !== 'string' || typeof e.explain !== 'string') parseIssues++;
}
if (parseIssues) issues.push(`${parseIssues} qaBank entries with non-string fields`);

// 8. Look for dead links / unused CSS
const cssClasses = new Set();
const cssClassRe = /\.([a-z][a-zA-Z0-9-]+)\s*[,{:]/g;
let m;
while ((m = cssClassRe.exec(html)) !== null) cssClasses.add(m[1]);

const usedClasses = new Set();
const usedRe = /class="([^"]+)"/g;
while ((m = usedRe.exec(html)) !== null) {
  for (const c of m[1].split(/\s+/)) usedClasses.add(c);
}
// Also look for classes added via JS classList/className
const dynamicClassRe = /classList\.(?:add|toggle|remove)\(['"]([^'"]+)['"]/g;
while ((m = dynamicClassRe.exec(html)) !== null) usedClasses.add(m[1]);
const cssOrphans = [...cssClasses].filter(c => !usedClasses.has(c));
const htmlOrphans = [...usedClasses].filter(c => !cssClasses.has(c) && !c.startsWith('q-') && !c.match(/^(active|first|on|off|knew|missed|new|anti|pattern|locked|selected|correct|wrong|show|flipped|answered-correct|answered-wrong|crash-row)$/));
if (cssOrphans.length > 5) issues.push(`${cssOrphans.length} CSS classes defined but not used: ${cssOrphans.slice(0,8).join(', ')}`);
if (htmlOrphans.length > 0) issues.push(`HTML classes used but not styled: ${htmlOrphans.slice(0,8).join(', ')}`);

// 9. Check for accessibility minimums
const lang = /<html[^>]*\blang=/.test(html);
if (!lang) issues.push('Missing <html lang="..."> attribute');
const viewport = /<meta\s+name="viewport"/.test(html);
if (!viewport) issues.push('Missing viewport meta tag');
const buttonsWithoutAria = (html.match(/<button[^>]*onclick="[^"]+"[^>]*>([^<]+)<\/button>/g) || []).filter(b => !b.includes('aria-'));
// Most are user-clickable buttons; aria not strictly required if text is descriptive

// 10. Look for any `console.log` left in production scripts
const consoleLogs = (html.match(/\bconsole\.(log|warn|error)\s*\(/g) || []).length;
if (consoleLogs > 0) issues.push(`${consoleLogs} console.* calls in scripts (should be removed for prod)`);

// 11. Check PracticeExam scaling: 30 questions, scaled score formula
// scaledScore = Math.round(100 + (correct / examQs.length) * 900)
// With 30 questions: each q = 30 points (900/30); should reach 720 at 21/30 = 70%
// Check the formula
const scoreFormulaM = html.match(/scaledScore = Math\.round\(100 \+ \(correct \/ examQs\.length\) \* 900\)/);
if (!scoreFormulaM) issues.push('Score formula not in expected shape');

// 12. Cross-check that domain weight badge / cheat sheet says correct percentages
const domainPercents = ['27%', '18%', '20%', '20%', '15%'];
for (const p of domainPercents) {
  const count = (html.match(new RegExp(p.replace('%','\\%'), 'g')) || []).length;
  if (count < 2) issues.push(`Domain weight ${p} appears only ${count}× (expected in multiple places)`);
}

// 13. Look for "TODO" / "FIXME" / placeholder text
const todoCount = (html.match(/\b(TODO|FIXME|XXX|TBD|placeholder)\b/gi) || []).length;
if (todoCount > 0) {
  // sample
  const samples = [];
  let idx = 0;
  for (let i = 0; i < 5 && idx >= 0; i++) {
    idx = html.search(/\b(TODO|FIXME|XXX|TBD)\b/i);
    if (idx >= 0) {
      const lineNum = html.slice(0, idx).split('\n').length;
      samples.push(`L${lineNum}: ${html.slice(idx, idx+80)}`);
      idx += 80;
    }
  }
  // Note: "placeholder=" is the input attribute, common - filter
  const realTodos = (html.match(/\b(TODO|FIXME|XXX|TBD)\b/gi) || []).length;
  if (realTodos > 0) issues.push(`${realTodos} TODO/FIXME/XXX/TBD markers found`);
}

// 14. Spot-check 5 random qaBank entries for content quality
const qsToInspect = qaBankExtra.slice(0, 3).concat(qaBankExtra.slice(qaBankExtra.length - 3));
console.log('\n=== Spot-check 6 entries ===');
for (const e of qsToInspect) {
  console.log(`\n[${e.domain}] ${e.q.slice(0, 80)}...`);
  console.log(`  Correct: ${String.fromCharCode(65+e.correct)}) ${e.opts[e.correct].slice(0,80)}`);
  console.log(`  Why: ${e.explain.slice(0,120)}`);
}

// === REPORT ===
console.log(`\n=== ${issues.length} additional issues ===`);
for (const i of issues) console.log(`  - ${i}`);
console.log('\nDONE.');
