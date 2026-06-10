// Apply verification corrections to merged_qa.json and re-patch the HTML.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const merged = JSON.parse(fs.readFileSync(path.join(dir, 'merged_qa.json'), 'utf8'));

let fixCount = 0;
const fixes = [];

for (const e of merged) {
  // FIX 1: D2 allowed_callers mischaracterization
  if (e.q.includes('allowed_callers') && e.q.includes('role of')) {
    const before = JSON.stringify(e);
    e.opts[0] = "Restricts which caller can invoke the tool: 'direct' (model-callable) or 'code_execution_20260120' (only callable from inside a code-execution sandbox via programmatic tool calling)";
    e.explain = "allowed_callers controls direct-vs-sandbox invocation. Values: 'direct' (default; model calls tool directly) or 'code_execution_20260120' (tool only callable from within the code execution sandbox).";
    e.correct = 0;
    fixCount++;
    fixes.push({q: e.q.slice(0, 60), changed: 'opt 0 + explain (D2 allowed_callers fix)'});
  }

  // FIX 2: D3 skill tool restriction. The question asks how to RESTRICT a skill's tools.
  // The previously marked answer (allowed-tools) only pre-approves, doesn't restrict.
  // The correct answer is permissions.deny in settings.json.
  if (e.q.includes('Skill should not execute shell') && e.q.includes('How to restrict')) {
    e.opts[1] = "permissions.deny rules in .claude/settings.json (e.g., Bash(rm:*) plus Bash); allowed-tools frontmatter only PRE-APPROVES, it does NOT restrict tool access";
    e.explain = "Per Claude Code docs, allowed-tools in skill frontmatter only PRE-APPROVES listed tools (skips permission prompts) — it does NOT restrict which tools are available. To block a skill from using specific tools, add deny rules in permissions settings (settings.json).";
    e.correct = 1;
    fixCount++;
    fixes.push({q: e.q.slice(0, 60), changed: 'opt 1 + explain (D3 allowed-tools restriction fix)'});
  }
}

console.log(`Applied ${fixCount} fixes:`);
for (const f of fixes) {
  console.log(`  - ${f.q}\n    ${f.changed}`);
}

if (fixCount === 0) {
  console.log('WARNING: No fixes applied. Check that question text patterns still match.');
  process.exit(1);
}

// Save corrected merged
fs.writeFileSync(path.join(dir, 'merged_qa.json'), JSON.stringify(merged, null, 2));

// Re-patch HTML
const htmlPath = path.join(dir, '..', 'claude-architect-study-guide 2.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const placeholder = /const qaBankExtra = \[[\s\S]*?\];/;
const out = merged.map(e => JSON.stringify(e)).join(',\n');
const replacement = 'const qaBankExtra = [\n' + out + '\n];';
if (placeholder.test(html)) {
  html = html.replace(placeholder, replacement);
  fs.writeFileSync(htmlPath, html);
  console.log(`\nRe-patched HTML with ${merged.length} entries (${fixCount} fixed).`);
} else {
  console.error('Placeholder not found in HTML.');
}
