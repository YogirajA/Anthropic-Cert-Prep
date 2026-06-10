// Apply audit-confirmed corrections to the HTML.
const fs = require('fs');
const path = require('path');
const htmlPath = path.join(__dirname, '..', 'claude-architect-study-guide 2.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const before = html.length;
let fixCount = 0;

function replace(pattern, replacement, label) {
  if (typeof pattern === 'string') {
    if (!html.includes(pattern)) {
      console.error(`  MISS: ${label} — pattern not found`);
      return false;
    }
    html = html.split(pattern).join(replacement);
  } else {
    if (!pattern.test(html)) {
      console.error(`  MISS: ${label} — regex no match`);
      return false;
    }
    html = html.replace(pattern, replacement);
  }
  fixCount++;
  console.log(`  OK: ${label}`);
  return true;
}

console.log('=== D1 fixes ===');

// FIX D1.1: AgentDefinition flashcard — remove isolation, add initialPrompt
replace(
  '"List the key fields of an AgentDefinition.",a:"description (required), prompt, tools, disallowedTools, model (sonnet|opus|haiku|inherit), skills, memory (user|project|local), mcpServers, maxTurns, background, effort (low|medium|high|xhigh|max), permissionMode, isolation."',
  '"List the key fields of an AgentDefinition.",a:"description (required), prompt, tools, disallowedTools, model (sonnet|opus|haiku|inherit or full ID), skills, memory (user|project|local), mcpServers, initialPrompt, maxTurns, background, effort (low|medium|high|xhigh|max), permissionMode. Note: isolation and color are sub-agent FILE frontmatter fields (.claude/agents/*.md), not AgentDefinition (SDK)."',
  'D1.1: AgentDefinition flashcard'
);

// FIX D1.2: AgentDefinition crash row — remove isolation, add initialPrompt
replace(
  'key:"AgentDefinition",val:"<code>description</code> (drives delegation), <code>prompt</code>, <code>tools</code>, <code>disallowedTools</code>, <code>model</code>, <code>skills</code>, <code>memory</code>, <code>mcpServers</code>, <code>maxTurns</code>, <code>background</code>, <code>effort</code>, <code>permissionMode</code>, <code>isolation</code>"',
  'key:"AgentDefinition",val:"<code>description</code> (drives delegation), <code>prompt</code>, <code>tools</code>, <code>disallowedTools</code>, <code>model</code>, <code>skills</code>, <code>memory</code>, <code>mcpServers</code>, <code>initialPrompt</code>, <code>maxTurns</code>, <code>background</code>, <code>effort</code>, <code>permissionMode</code>. Note: <code>isolation</code> and <code>color</code> are sub-agent FILE frontmatter (.claude/agents/), not AgentDefinition fields."',
  'D1.2: AgentDefinition crash row'
);

// FIX D1.3: examQs Q25 explanation — remove "Anthropic's pattern" overclaim
replace(
  'A shared vector store decouples state from invocation — agents write findings and read only what\'s relevant via semantic search. Prevents exponential token scaling and protects against state loss on crashes. This is the pattern Anthropic\'s own multi-agent research system uses. Summarization loses detail; truncation loses early findings; no shared context misses cross-agent dependencies.',
  'Decouple state from invocation: subagents write findings to durable storage (filesystem artifacts and/or a vector store) and pass lightweight references to the lead. Per Anthropic\'s multi-agent research blog, subagents do NOT share memory directly: they return findings to the lead, and the lead persists its plan to memory to survive long contexts. The "subagent output to filesystem to minimize the game of telephone" pattern in Anthropic\'s appendix is the closest canonical match. Either approach prevents exponential token scaling vs daisy-chaining full conversation logs.',
  'D1.3: Q25 examQs explanation'
);
// Same content also exists with regular hyphen instead of em-dash; check both
replace(
  'A shared vector store decouples state from invocation - agents write findings and read only what\'s relevant via semantic search. Prevents exponential token scaling and protects against state loss on crashes. This is the pattern Anthropic\'s own multi-agent research system uses. Summarization loses detail; truncation loses early findings; no shared context misses cross-agent dependencies.',
  'Decouple state from invocation: subagents write findings to durable storage (filesystem artifacts and/or a vector store) and pass lightweight references to the lead. Per Anthropic\'s multi-agent research blog, subagents do NOT share memory directly: they return findings to the lead, and the lead persists its plan to memory to survive long contexts. The "subagent output to filesystem to minimize the game of telephone" pattern in Anthropic\'s appendix is the closest canonical match. Either approach prevents exponential token scaling vs daisy-chaining full conversation logs.',
  'D1.3 (alt): Q25 examQs explanation - hyphen variant'
);

console.log('\n=== D3 fixes ===');

// FIX D3.1: acceptEdits commands — remove rm and sed
replace(
  'acceptEdits (auto-approves edits + mkdir/touch/rm/mv/cp/sed)',
  'acceptEdits (auto-approves edits + filesystem commands such as mkdir/touch/mv/cp; other shell commands need explicit allow rules)',
  'D3.1a: Quick Review acceptEdits row'
);
replace(
  'acceptEdits</code> (auto-approves edits + mkdir/touch/rm/mv/cp/sed)',
  'acceptEdits</code> (auto-approves edits + filesystem commands such as mkdir/touch/mv/cp; other shell commands need explicit allow rules)',
  'D3.1b: Quick Review acceptEdits row (with code tag variant)'
);
replace(
  'acceptEdits (auto-approves edits + filesystem commands like mkdir, touch, rm, mv, cp, sed)',
  'acceptEdits (auto-approves edits + filesystem commands such as mkdir, touch, mv, cp; other shell commands need explicit allow rules)',
  'D3.1c: Permission modes alt-form'
);
// Card explanation in flashcards
replace(
  'acceptEdits auto-approves Edit/Write plus <code>mkdir</code>, <code>touch</code>, <code>rm</code>, <code>mv</code>, <code>cp</code>, <code>sed</code>',
  'acceptEdits auto-approves Edit/Write plus filesystem commands such as <code>mkdir</code>, <code>touch</code>, <code>mv</code>, <code>cp</code> (other shell commands need explicit allow rules)',
  'D3.1d: cheat sheet variant'
);
// Plain prose variant in flashcard answers
replace(
  'acceptEdits (auto-approves Edit/Write plus mkdir, touch, rm, mv, cp, sed)',
  'acceptEdits (auto-approves Edit/Write plus filesystem commands such as mkdir, touch, mv, cp; other shell commands need explicit allow rules)',
  'D3.1e: flashcard prose variant'
);
// Q&A variant
replace(
  'acceptEdits (auto-approves Edit/Write plus mkdir, touch, rm, mv, cp, sed)',
  'acceptEdits (auto-approves Edit/Write plus filesystem commands such as mkdir, touch, mv, cp; other shell commands need explicit allow rules)',
  'D3.1f: Q&A variant (idempotent)'
);
// Q&A flashcard variant
replace(
  'auto-approves Edit/Write plus mkdir/touch/rm/mv/cp/sed',
  'auto-approves Edit/Write plus filesystem commands such as mkdir/touch/mv/cp; other shell commands need explicit allow rules',
  'D3.1g: card variant slash form'
);
replace(
  'auto-approves edits + mkdir/touch/rm/mv/cp/sed',
  'auto-approves edits + filesystem commands such as mkdir/touch/mv/cp; other shell commands need explicit allow rules',
  'D3.1h: another slash form'
);

console.log('\n=== D4 fixes ===');

// FIX D4.1: Interleaved Thinking row — fix Sonnet 4.6 claim
replace(
  'Layer-2 pattern: thinking block runs BETWEEN every tool call (model reasons, calls tool, reasons again, calls next tool, etc). Automatic on Opus 4.7/4.6 with adaptive thinking. On Sonnet 4.6 with manual thinking, requires <code>interleaved-thinking-2025-05-14</code> beta header. Lets <code>budget_tokens</code> exceed <code>max_tokens</code>.',
  'Layer-2 pattern: thinking block runs BETWEEN every tool call (model reasons, calls tool, reasons again, calls next tool, etc). Automatic on Opus 4.7, Opus 4.6, and Sonnet 4.6 with adaptive thinking (no beta header). The <code>interleaved-thinking-2025-05-14</code> beta header is only for older Claude 4 models (Opus 4.5/4.1/4, Sonnet 4.5/4). Lets <code>budget_tokens</code> exceed <code>max_tokens</code>.',
  'D4.1: Interleaved Thinking row'
);

console.log('\n=== D5 fixes ===');

// FIX D5.1: Haiku 4.5 cache minimum is 4096, not 2048
replace(
  'Cache minimums:</strong> Opus 4.7/4.6 = 4096 tokens; Sonnet 4.6 / Haiku 4.5 = 2048 tokens',
  'Cache minimums:</strong> Opus 4.7 / 4.6 / 4.5 = 4096 tokens; Haiku 4.5 = 4096 tokens; Sonnet 4.6 = 2048 tokens; Sonnet 4.5 = 1024 tokens',
  'D5.1a: Cheat sheet cache minimums'
);
replace(
  'Cache minimums",val:"Opus 4.7 / 4.6 = 4096 tokens. Sonnet 4.6 / Haiku 4.5 = 2048 tokens. Below-min caches silently',
  'Cache minimums",val:"Opus 4.7 / 4.6 / 4.5 = 4096 tokens. Haiku 4.5 = 4096 tokens. Sonnet 4.6 = 2048 tokens. Sonnet 4.5 = 1024 tokens. Below-min caches silently',
  'D5.1b: Quick Review cache minimums'
);
replace(
  'Opus 4.7 = 4096.</strong> Sonnet 4.6? <strong>A: 2048.',
  'Opus 4.7 = 4096.</strong> Sonnet 4.6? <strong>A: 2048. Haiku 4.5? A: 4096.',
  'D5.1c: flashcard about cache mins'
);
replace(
  'Cache mins - Opus 4.7 = 4096, Sonnet 4.6/Haiku 4.5 = 2048',
  'Cache mins - Opus 4.7/4.6/4.5 = 4096, Haiku 4.5 = 4096, Sonnet 4.6 = 2048, Sonnet 4.5 = 1024',
  'D5.1d: alt form'
);
// Multiple Q&A bank entries reference cache minimums
replace(
  'Opus 4.7 / 4.6 = 4096 tokens. Sonnet 4.6 / Haiku 4.5 = 2048 tokens',
  'Opus 4.7 / 4.6 / 4.5 = 4096 tokens. Haiku 4.5 = 4096 tokens. Sonnet 4.6 = 2048 tokens. Sonnet 4.5 = 1024 tokens',
  'D5.1e: Q&A bank pattern (idempotent)'
);
replace(
  'Sonnet 4.6 / Haiku 4.5 = 2048',
  'Sonnet 4.6 = 2048. Sonnet 4.5 = 1024. Haiku 4.5 = 4096',
  'D5.1f: another Q&A pattern'
);

// FIX D5.2: Soften unverified GA-date specifics for Memory tool
replace(
  'Memory tool (GA Feb 17, 2026)',
  'Memory tool (GA, 2026)',
  'D5.2a: Memory tool GA date - cheat sheet'
);
replace(
  'Memory tool GA Feb 17, 2026',
  'Memory tool GA',
  'D5.2b: Memory tool GA date - 2026 ref'
);
replace(
  'memory_20250818</code> &mdash; no beta header.',
  'memory_20250818</code>; no beta header (GA).',
  'D5.2c: Memory tool entity replacement (idempotent)'
);
// Sonnet 4.5 1M beta retirement
replace(
  'Sonnet 4.5 1M beta (context-1m-2025-08-07) was retired April 30, 2026',
  'Sonnet 4.5\'s earlier 1M context beta has been retired in 2026; only Opus 4.7, Opus 4.6, and Sonnet 4.6 retain 1M GA',
  'D5.2d: Sonnet 4.5 retirement specifics'
);
replace(
  'Sonnet 4.5\'s 1M beta (context-1m-2025-08-07) was retired April 30, 2026',
  'Sonnet 4.5\'s earlier 1M context beta has been retired in 2026; only Opus 4.7, Opus 4.6, and Sonnet 4.6 retain 1M GA',
  'D5.2e: variant'
);
replace(
  'Sonnet 4.5 1M beta retired April 30, 2026',
  'Sonnet 4.5 1M beta retired in 2026',
  'D5.2f: short variant'
);

// FIX D5.3: Subagent memory path — soften (only verified for project scope)
replace(
  'subagent memory frontmatter</strong> <code>memory: user|project|local</code> stored at <code>~/.claude/agent-memory/</code>',
  'subagent memory frontmatter</strong> <code>memory: project</code> stored at <code>./.claude/agent-memory/&lt;agent-name&gt;/</code> (the user/local variants are referenced in some docs but path specifics may vary)',
  'D5.3: subagent memory paths'
);

console.log(`\n=== Summary ===`);
console.log(`Applied ${fixCount} fixes`);
console.log(`Size before: ${before}, after: ${html.length}`);
fs.writeFileSync(htmlPath, html);
console.log('Saved.');
