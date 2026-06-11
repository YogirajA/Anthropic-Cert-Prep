#!/usr/bin/env node
/*
 * Health check for the CCA-F study guide. Structural + consistency checks that
 * do NOT rot over time (no hardcoded "current model" values — staleness of FACTS
 * is a judgment call for the model running the skill; this script guards STRUCTURE).
 *
 * Run from the repo root:  node .claude/skills/update-course/scripts/verify.mjs
 * Exits non-zero if any check fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const htmlName = fs.readdirSync(root).find(f => /^claude-architect-study-guide.*\.html$/.test(f));
if (!htmlName) { console.error('ERROR: study-guide HTML not found in ' + root); process.exit(2); }
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');

let failures = 0;
const fail = (m) => { console.log('  ✗ ' + m); failures++; };
const ok = (m) => console.log('  ✓ ' + m);

// Pull a `const NAME = [ ... ]` array literal out of the HTML via balanced-bracket scan.
function extractArray(name) {
  const start = html.indexOf(`const ${name} = [`);
  if (start < 0) return null;
  const open = html.indexOf('[', start);
  let depth = 0, inStr = null, esc = false, i = open;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  // Evaluate the first-party array literal in an isolated context (same approach as tts/extract.js).
  try { return vm.runInNewContext('(' + html.slice(open, i) + ')', Object.create(null), { timeout: 2000 }); }
  catch (e) { fail(`could not parse array ${name}: ${e.message}`); return null; }
}

// [1] Every <script> block parses
console.log('\n[1] JavaScript parse');
const blocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let jsOk = true;
blocks.forEach((c, i) => { try { new Function(c); } catch (e) { jsOk = false; fail(`script block ${i}: ${e.message}`); } });
if (jsOk) ok(`all ${blocks.length} <script> block(s) parse`);

// [2] Data arrays load and have the expected shape
console.log('\n[2] Data arrays');
const allCards = extractArray('allCards') || [];
const examQs = extractArray('examQs') || [];
const qaBankExtra = extractArray('qaBankExtra') || [];
const crashRows = extractArray('crashRows') || [];
ok(`allCards=${allCards.length}  examQs=${examQs.length}  qaBankExtra=${qaBankExtra.length}  crashRows=${crashRows.length}`);
for (const c of allCards) if (!c.d || !c.q || !c.a) fail(`flashcard missing d/q/a: ${JSON.stringify(c).slice(0, 80)}`);
for (const r of crashRows) if (!r.d || !r.key || !r.val) fail(`crashRow missing d/key/val: ${JSON.stringify(r).slice(0, 80)}`);

// [3] Every question's correct-answer index is valid (catches broken answer keys)
console.log('\n[3] Question answer-index integrity');
const checkQ = (q, where) => {
  const opts = q.opts || q.options;
  if (!Array.isArray(opts) || opts.length < 2) { fail(`${where}: missing/short options`); return; }
  if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= opts.length)
    fail(`${where}: correct=${q.correct} out of range for ${opts.length} options — "${(q.q || '').slice(0, 60)}"`);
};
examQs.forEach((q, i) => checkQ(q, `examQs[${i}]`));
qaBankExtra.forEach((q, i) => checkQ(q, `qaBankExtra[${i}]`));
if (failures === 0 || true) ok(`${examQs.length + qaBankExtra.length} questions checked for valid correct-index`);

// [4] Badge / header counts match the arrays (no drift between UI labels and data)
console.log('\n[4] UI label vs data consistency');
const badge = html.match(/(\d+)\s*Flashcards/);
if (badge && +badge[1] !== allCards.length) fail(`badge says ${badge[1]} Flashcards but allCards=${allCards.length}`);
else if (badge) ok(`flashcard badge (${badge[1]}) matches allCards`);
const examHdr = html.match(/Practice Exam:\s*(\d+)\s*Questions/);
if (examHdr && +examHdr[1] !== examQs.length) fail(`header says ${examHdr[1]} Questions but examQs=${examQs.length}`);
else if (examHdr) ok(`exam header (${examHdr[1]}) matches examQs`);

// [5] Tab button <-> section wiring
console.log('\n[5] Tab wiring');
const tabIds = [...html.matchAll(/showSection\('([a-z0-9]+)'\)/g)].map(m => m[1]);
const uniqTabs = [...new Set(tabIds)];
for (const id of uniqTabs)
  if (!new RegExp(`id="${id}"[^>]*class="[^"]*section`).test(html) && !new RegExp(`class="[^"]*section[^"]*"[^>]*id="${id}"`).test(html))
    fail(`tab '${id}' has no matching <div class="section" id="${id}">`);
ok(`${uniqTabs.length} tabs wired: ${uniqTabs.join(', ')}`);

// [6] TTS scripts match the bank (spot-check + staleness of the generated text)
console.log('\n[6] TTS scripts');
const d5 = path.join(root, 'tts', 'scripts', 'd5-context.txt');
if (fs.existsSync(d5)) {
  const s = fs.readFileSync(d5, 'utf8');
  // The script answer must equal opts[correct] for the Opus 4.7 cache-min question, whatever it currently is.
  const q = qaBankExtra.find(x => /minimum cacheable token count for Claude Opus 4\.7/.test(x.q || ''));
  if (q) {
    const want = (q.opts || q.options)[q.correct];
    if (!s.includes(`Answer, ${want}`)) fail(`d5-context.txt is STALE: Opus 4.7 cache-min answer should be "${want}". Run: cd tts && npm run extract`);
    else ok(`scripts match bank (Opus 4.7 cache-min = "${want}")`);
  }
} else {
  console.log('  - tts/scripts/d5-context.txt not found (run `cd tts && npm run extract`)');
}

// [7] Literal XML tags in exam/Q&A options must be HTML-escaped. Raw <tag> in an option/explain is
//     parsed as a DOM element by innerHTML (so it renders as just "...") and is stripped by the TTS
//     narrator (so the spoken answer is blank). They must be written as &lt;tag&gt;. (Flashcards are
//     exempt — they render via textContent, so raw tags are correct there and are not narrated.)
console.log('\n[7] Escaped literal-XML in exam/Q&A options');
const FORMAT_TAGS = /^(code|strong|em|br|span|mark|b|i|u|sub|sup|small)$/i;
let rawHits = 0;
const scanRawTags = (q, where) => {
  for (const txt of [...(q.opts || q.options || []), q.explain || '']) {
    const re = /<([a-zA-Z][\w-]*)/g; let m;
    while ((m = re.exec(String(txt)))) if (!FORMAT_TAGS.test(m[1])) {
      fail(`${where}: raw literal-XML tag <${m[1]}> — escape as &lt;${m[1]}&gt; (else renders as "..." and narrates blank)`);
      rawHits++;
    }
  }
};
examQs.forEach((q, i) => scanRawTags(q, `examQs[${i}]`));
qaBankExtra.forEach((q, i) => scanRawTags(q, `qaBankExtra[${i}]`));
if (rawHits === 0) ok('no unescaped literal-XML tags in exam/Q&A options');

console.log('\n' + (failures === 0 ? 'PASS — all structural checks green' : `FAIL — ${failures} issue(s) above`));
process.exit(failures === 0 ? 0 : 1);
