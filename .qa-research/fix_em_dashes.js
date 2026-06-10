// Replace em-dashes per user requirement: use colon/period/comma/"and" or rewrite.
// Heuristic mass replacement:
//   " — " followed by lowercase → ", " (clause continuation)
//   " — " followed by uppercase → ". " (sentence break)
//   "—" without spaces → "-" (regular hyphen)
//   ", — " or " — ," → ", " (collapse stray)
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'claude-architect-study-guide 2.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const before = (html.match(/—/g) || []).length;
console.log(`Before: ${before} em-dashes`);

let replaced = {comma: 0, period: 0, hyphen: 0, other: 0};

// Pass 1: " — " followed by lowercase → ", "
html = html.replace(/ — ([a-z])/g, (_, c) => { replaced.comma++; return ', ' + c; });

// Pass 2: " — " followed by uppercase → ". "
html = html.replace(/ — ([A-Z])/g, (_, c) => { replaced.period++; return '. ' + c; });

// Pass 3: " — " at end of string-ish context (rare)
html = html.replace(/ — /g, () => { replaced.other++; return ', '; });

// Pass 4: "—" without surrounding spaces (compound word style)
html = html.replace(/—/g, () => { replaced.hyphen++; return '-'; });

const after = (html.match(/—/g) || []).length;
console.log(`After: ${after} em-dashes`);
console.log(`Replacements: ${JSON.stringify(replaced)}`);

if (after === 0) {
  fs.writeFileSync(htmlPath, html);
  console.log('Saved.');
} else {
  console.error(`STILL ${after} em-dashes after replacement; not saving`);
  process.exit(1);
}
