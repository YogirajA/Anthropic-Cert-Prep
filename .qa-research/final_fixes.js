// Final cleanup: badge count + &mdash; replacement
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'claude-architect-study-guide 2.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Fix 1: Flashcards badge count (85 → 106)
const badgeBefore = html.match(/<span class="badge">(\d+)\s+Flashcards<\/span>/);
if (badgeBefore) {
  html = html.replace(/<span class="badge">\d+\s+Flashcards<\/span>/, '<span class="badge">106 Flashcards</span>');
  console.log(`Badge: ${badgeBefore[1]} → 106 Flashcards`);
}

// Fix 1b: Practice Qs badge: also verify
const pqBadge = html.match(/<span class="badge">(\d+)\s+Practice Qs<\/span>/);
if (pqBadge) {
  console.log(`Practice Qs badge: ${pqBadge[1]} (should be 30)`);
}

// Fix 2: Replace &mdash; per user style policy.
// Strategy: " &mdash; " → ": " (colon + space; drop leading space).
//           "&mdash; " → ": "
//           " &mdash;" → ":"
//           "&mdash;" (rare) → ": "
const mdashBefore = (html.match(/&mdash;/g) || []).length;
html = html.replace(/ &mdash; /g, ': ');
html = html.replace(/&mdash; /g, ': ');
html = html.replace(/ &mdash;/g, ':');
html = html.replace(/&mdash;/g, ': ');
const mdashAfter = (html.match(/&mdash;/g) || []).length;
console.log(`&mdash;: ${mdashBefore} → ${mdashAfter}`);

// Sanity: literal em-dashes still 0
const literalEmDash = (html.match(/—/g) || []).length;
console.log(`Literal em-dashes remaining: ${literalEmDash}`);

// Fix 3: Update Practice Exam header that contained &mdash; → ":"
// Already covered by mdash replacement.

// Fix 4: Fix any over-replaced double colons
html = html.replace(/::(?!\/\/)/g, ':'); // protect URL :// patterns
html = html.replace(/:\s+:/g, ':');

if (mdashAfter === 0 && literalEmDash === 0) {
  fs.writeFileSync(htmlPath, html);
  console.log('Saved.');
} else {
  console.error('FAIL: residual em-dashes remain');
  process.exit(1);
}
