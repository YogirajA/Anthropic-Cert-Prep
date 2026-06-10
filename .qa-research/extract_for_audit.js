// Extract every data slice from the HTML for parallel verification.
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'claude-architect-study-guide 2.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const grab = (start, end) => {
  const s = html.indexOf(start);
  const e = html.indexOf(end, s);
  return (new Function('return [' + html.slice(s + start.length, e) + ']'))();
};

const allCards = grab('const allCards = [', '];');
const examQs = grab('const examQs = [', '];');
const qaBankExtra = grab('const qaBankExtra = [', '];');
const crashRows = grab('const crashRows = [', '];');

// Group by domain
const byDom = {d1:{cards:[],crash:[]}, d2:{cards:[],crash:[]}, d3:{cards:[],crash:[]}, d4:{cards:[],crash:[]}, d5:{cards:[],crash:[]}, pb:{cards:[],crash:[]}, ref:{crash:[]}};
for (const c of allCards) {
  if (byDom[c.d]) byDom[c.d].cards.push(c);
}
for (const r of crashRows) {
  if (byDom[r.d]) byDom[r.d].crash.push(r);
}

// Extract cheat sheet sections (between <h3> in #sheet div)
const sheetStart = html.indexOf('<div id="sheet"');
const sheetEnd = html.indexOf('</div>\n\n<script>', sheetStart);
const sheet = html.slice(sheetStart, sheetEnd);

// Match each <div class="sheet-domain"> ... </div> block
const sectionRe = /<div class="sheet-domain">([\s\S]*?)<\/div>\s*(?=<div class="sheet-domain"|$)/g;
const sections = [];
let m;
while ((m = sectionRe.exec(sheet)) !== null) {
  const titleMatch = m[1].match(/<h3>([\s\S]*?)<\/h3>/);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'untitled';
  // Extract sheet-items as plain-text-ish
  const items = [...m[1].matchAll(/<div class="sheet-item">([\s\S]*?)<\/div>/g)].map(x => x[1].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim());
  sections.push({ title, items });
}

console.log('Cheat sheet sections:');
for (const s of sections) console.log(`  [${s.items.length} items] ${s.title}`);

// Write per-domain audit files
for (const [d, data] of Object.entries(byDom)) {
  const out = {
    domain: d,
    cards: data.cards || [],
    crash: data.crash,
    examQs: examQs.filter(q => q.domain === d),
  };
  fs.writeFileSync(path.join(__dirname, `audit_${d}.json`), JSON.stringify(out, null, 1));
}

// Write cheat sheet sections
fs.writeFileSync(path.join(__dirname, 'audit_sheet.json'), JSON.stringify(sections, null, 2));

console.log('\nFiles written:');
for (const d of Object.keys(byDom)) {
  const data = byDom[d];
  console.log(`  audit_${d}.json: ${data.cards?.length || 0} cards, ${data.crash.length} crash rows`);
}
console.log(`  audit_sheet.json: ${sections.length} cheat sheet sections`);
