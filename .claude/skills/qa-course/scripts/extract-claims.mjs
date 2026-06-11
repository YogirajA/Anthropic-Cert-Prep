#!/usr/bin/env node
/*
 * Pull the hallucination-prone, doc-checkable CLAIMS out of the study guide so an audit becomes a finite
 * checklist ("verify these N things against official docs") instead of "re-read everything".
 *
 * Run from the repo root:  node .claude/skills/qa-course/scripts/extract-claims.mjs
 * Read-only — prints grouped, de-duplicated claims with counts and a sample line number for each.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlName = fs.readdirSync(root).find(f => /^claude-architect-study-guide.*\.html$/.test(f));
if (!htmlName) { console.error('ERROR: study-guide HTML not found in ' + root); process.exit(2); }
const lines = fs.readFileSync(path.join(root, htmlName), 'utf8').split('\n');

// Collect distinct matches of `re` across the file: value -> {count, firstLine}.
function collect(re) {
  const map = new Map();
  lines.forEach((line, i) => {
    for (const m of line.matchAll(re)) {
      const v = m[1] ?? m[0];
      if (!map.has(v)) map.set(v, { count: 0, line: i + 1 });
      map.get(v).count++;
    }
  });
  return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
}

function report(title, entries, note) {
  console.log(`\n## ${title}  (${entries.length} distinct)`);
  if (note) console.log('   ' + note);
  for (const [v, { count, line }] of entries) console.log(`   [ ] ${v}   ×${count}  (L${line})`);
}

const groups = [
  ['Beta headers — verify each EXISTS with this exact date suffix, and which models/conditions',
   /\b([a-z][a-z0-9]*(?:-[a-z0-9]+)*-20\d{2}-\d{2}-\d{2})\b/g,
   'These are the single most hallucinated thing. Confirm header string + supported models against docs.'],
  ['Model IDs — verify each is a real, current model string',
   /\b(claude-(?:opus|sonnet|haiku|fable|mythos|\d)[a-z0-9.-]*)\b/g,
   'Cross-check vs the claude-api skill / models doc. Flag retired or invented IDs (incl. typo-distractors like claude-opus-47, which should only ever appear as a WRONG option).'],
  ['Versioned tool / strategy IDs (text_editor_*, memory_*, compact_*, clear_*_*)',
   /\b([a-z][a-z0-9]*(?:_[a-z0-9]+)*_20\d{6})\b/g,
   'Verify the date-version exists and the tool behaves as described.'],
  ['CLI flags — verify each is a real flag (watch for invented ones used as REAL, e.g. --batch/--headless)',
   /(?<![\w-])(--[a-z][a-z0-9-]+)/g,
   'NOTE: some appear only as intentional WRONG-answer distractors — that is correct. Confirm any used as fact.'],
  ['Standalone spec-version / dates (e.g., MCP 2025-11-25) — confirm current',
   /(?<![\w-])(20\d{2}-\d{2}-\d{2})(?!-)/g,
   'Excludes dates that are part of a beta-header token above.'],
  ['Prices ($/MTok) — out of exam scope but should still be correct',
   /(\$\d[\d.]*)/g, ''],
  ['Numeric limits (tokens / context / output / GB / MB / pages / requests)',
   /\b(\d[\d,]*\s?(?:tokens|GB|MB|pages|requests|breakpoints))\b/gi,
   'Verify each against the relevant doc (context windows, output caps, cache mins, Files/Batch limits).'],
];

console.log('# Doc-checkable claims in ' + htmlName);
console.log('# Tick each off after verifying against platform.claude.com/docs, code.claude.com/docs, or modelcontextprotocol.io.');
for (const [title, re, note] of groups) report(title, collect(re), note);

console.log('\n# Also audit by reading (not regex-extractable):');
console.log('#  - MODEL-SUPPORT LISTS ("X is supported on Opus 4.8/4.7/Sonnet 4.6/…") — the highest-risk category.');
console.log('#  - Q&A answer KEYS: is the `correct` option actually correct per docs? (verify.mjs only checks the index is in range.)');
console.log('#  - Cross-tab CONTRADICTIONS: the same fact must read identically in every tab.');
console.log('#  - Community mnemonics presented as official (CALM/SPIDER/PRECISE) and made-up API fields.');
