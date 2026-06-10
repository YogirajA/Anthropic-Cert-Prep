// Programmatic pre-screen for likely Q&A errors before agent verification.
const fs = require('fs');
const path = require('path');

const merged = JSON.parse(fs.readFileSync(path.join(__dirname, 'merged_qa.json'), 'utf8'));
console.log(`Loaded ${merged.length} entries\n`);

const issues = [];

// --- Check 1: Duplicate or near-duplicate questions ---
const qNorm = q => q.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
const seen = {};
for (const e of merged) {
  const k = qNorm(e.q);
  if (seen[k]) {
    if (seen[k].correct !== e.correct) {
      issues.push({
        type: 'CONTRADICTION',
        q: e.q.slice(0, 80),
        msg: `Duplicate question with different correct answer (${seen[k].correct} vs ${e.correct})`
      });
    }
  } else {
    seen[k] = e;
  }
}

// --- Check 2: Correct index out of range ---
for (const e of merged) {
  if (typeof e.correct !== 'number' || e.correct < 0 || e.correct > 3) {
    issues.push({type: 'BAD_INDEX', q: e.q.slice(0, 80), msg: `correct=${e.correct}`});
  }
  if (!Array.isArray(e.opts) || e.opts.length !== 4) {
    issues.push({type: 'BAD_OPTS_COUNT', q: e.q.slice(0, 80), msg: `opts.length=${e.opts?.length}`});
  }
}

// --- Check 3: Explanation contradicts correct option (heuristic) ---
// Look for cases where explanation contains "is NOT" or "incorrect" pointing at the correct answer text
for (const e of merged) {
  const correctOpt = e.opts[e.correct]?.toLowerCase() || '';
  const exp = (e.explain || '').toLowerCase();
  // Very loose heuristic: if explanation says "is wrong" or "is incorrect" right next to correct option text
  const negativeMarkers = ['is not the', 'is wrong', 'is incorrect', 'this is bad', 'avoid this'];
  for (const marker of negativeMarkers) {
    if (exp.includes(marker)) {
      // Find a snippet near the marker
      const idx = exp.indexOf(marker);
      const snippet = exp.slice(Math.max(0, idx-40), idx+80);
      // If correct option keywords appear near the negative marker, flag
      const correctWords = correctOpt.split(/\W+/).filter(w => w.length > 5).slice(0, 3);
      const overlap = correctWords.filter(w => snippet.includes(w)).length;
      if (overlap >= 2) {
        issues.push({type: 'EXP_CONTRADICTS', q: e.q.slice(0, 80), msg: `explanation may contradict correct answer ("${snippet.trim()}")`});
        break;
      }
    }
  }
}

// --- Check 4: Suspicious specifics (might be hallucinated) ---
// Flag entries with very specific numbers/strings that we should verify
const suspiciousPatterns = [
  /(\d{4,})\s*(?:tokens?|requests?|MB|GB|chars?|characters)/gi,
  /\b(claude-[a-z]+-\d-\d|claude-\d\.\d|claude_\d)/gi,
  /\b\d{4}-\d{2}-\d{2}\b/g, // date strings (beta headers)
  /v\d+\.\d+\.\d+/g, // version strings
  /\$[A-Z_]+(?:_[A-Z]+)*/g, // env var names
];
const specificClaims = new Map();
for (const e of merged) {
  const text = e.q + ' ' + e.opts.join(' ') + ' ' + e.explain;
  for (const re of suspiciousPatterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const claim = m[0].toLowerCase();
      if (!specificClaims.has(claim)) specificClaims.set(claim, []);
      specificClaims.get(claim).push(e.q.slice(0, 60));
    }
  }
}

// --- Check 5: Look for known-incorrect patterns ---
const knownErrors = [
  // Pattern: regex check, message
  { test: /tool_choice.*\bany\b.*compatible.*thinking/i, msg: 'Claim: any compatible with thinking — should be INCOMPATIBLE' },
  { test: /memory tool requires.*beta header/i, msg: 'Memory tool is GA, no beta header' },
  { test: /1M context.*beta header/i, msg: '1M context is GA on Opus 4.7/4.6/Sonnet 4.6, no beta header' },
  { test: /Task tool was renamed in v2\.0/i, msg: 'Task→Agent rename was v2.1.63, not v2.0' },
];
for (const e of merged) {
  const text = e.q + ' ' + e.opts.join(' ') + ' ' + e.explain;
  for (const k of knownErrors) {
    if (k.test.test(text)) {
      issues.push({type: 'KNOWN_PATTERN', q: e.q.slice(0, 80), msg: k.msg});
    }
  }
}

// --- Report ---
console.log(`=== ${issues.length} flagged entries ===\n`);
const byType = {};
for (const i of issues) {
  byType[i.type] = (byType[i.type] || 0) + 1;
}
console.log('By type:', byType);
console.log('\n=== First 20 issues ===');
for (const i of issues.slice(0, 20)) {
  console.log(`[${i.type}] ${i.q}\n  → ${i.msg}\n`);
}

// Persist all issues
fs.writeFileSync(path.join(__dirname, 'prescreen_issues.json'), JSON.stringify(issues, null, 2));
fs.writeFileSync(path.join(__dirname, 'specific_claims.json'), JSON.stringify(
  [...specificClaims.entries()].slice(0, 100).map(([k,v]) => ({claim: k, count: v.length})),
  null, 2
));
console.log(`\nWrote prescreen_issues.json (${issues.length}) and specific_claims.json`);
