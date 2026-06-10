// Merge all Q&A files into a single deduplicated qaBankExtra array, then patch the HTML.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = [
  'domain1_questions.js',
  'domain2_questions.js',
  'domain3_questions.js',
  'domain4_questions.js',
  'domain5_context_reliability.txt',
  'scraped_questions.js'
];

let all = [];
let seen = new Set();
let perDomain = {d1:0, d2:0, d3:0, d4:0, d5:0};

for (const fname of files) {
  const fpath = path.join(dir, fname);
  if (!fs.existsSync(fpath)) {
    console.error(`MISSING: ${fname}`);
    continue;
  }
  let content = fs.readFileSync(fpath, 'utf8');

  // Strip code fences and line comments
  content = content
    .replace(/^```[a-zA-Z]*\s*$/gm, '')
    .replace(/^```\s*$/gm, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .trim();

  // The content may be one of:
  //   [ {...}, {...}, ... ]   (proper array)
  //   {...}\n{...}\n{...}     (newline-separated)
  // Normalize to array form.
  if (!content.startsWith('[')) {
    // Wrap with [] and replace newlines between objects with commas
    content = '[' + content.replace(/\}\s*\n\s*\{/g, '},{') + ']';
  }

  let arr;
  try {
    // Use Function constructor to evaluate the JS literal safely-ish
    arr = (new Function('return ' + content))();
  } catch (e) {
    console.error(`Parse failure in ${fname}: ${e.message}`);
    // Try once more by force-wrapping
    try {
      arr = (new Function('return [' + content.replace(/^\[/, '').replace(/\]$/, '') + ']'))();
    } catch (e2) {
      console.error(`  Second attempt also failed: ${e2.message}`);
      continue;
    }
  }

  if (!Array.isArray(arr)) {
    console.error(`Not an array: ${fname}`);
    continue;
  }

  let newCount = 0;
  for (const entry of arr) {
    if (!entry || !entry.q || !entry.opts || !Array.isArray(entry.opts) || entry.opts.length !== 4) continue;
    if (typeof entry.correct !== 'number' || entry.correct < 0 || entry.correct > 3) continue;
    if (!entry.domain || !['d1','d2','d3','d4','d5'].includes(entry.domain)) continue;
    const key = entry.q.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(entry);
    perDomain[entry.domain]++;
    newCount++;
  }
  console.log(`${fname}: parsed ${arr.length}, added ${newCount} unique`);
}

console.log(`\nTotal unique: ${all.length}`);
console.log('Per domain:', perDomain);

// Write merged file as a JS array literal (compact-ish, one entry per line)
const out = all.map(e => JSON.stringify(e)).join(',\n');
fs.writeFileSync(path.join(dir, 'merged_qa.json'), '[\n' + out + '\n]\n');
console.log('Wrote merged_qa.json');

// Patch the HTML: replace `const qaBankExtra = [];` with the merged data.
const htmlPath = path.join(dir, 'claude-architect-study-guide 2.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const placeholder = /const qaBankExtra = \[[\s\S]*?\];/;
const replacement = 'const qaBankExtra = [\n' + out + '\n];';
if (placeholder.test(html)) {
  html = html.replace(placeholder, replacement);
  fs.writeFileSync(htmlPath, html);
  console.log(`Patched HTML with ${all.length} extra Q&A entries.`);
} else {
  console.error('Placeholder not found in HTML; skipping patch');
}
