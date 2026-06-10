const fs = require('fs');
const html = fs.readFileSync('../claude-architect-study-guide 2.html', 'utf8');

console.log('=== Residual issue check ===');
const issues = [];

const m1 = (html.match(/~3% (?:on|of)/g) || []).length;
if (m1) issues.push('~3% references: ' + m1);

const m2 = (html.match(/rm\/(?:mv\/)?cp\/sed/g) || []).length;
if (m2) issues.push('rm/sed in acceptEdits: ' + m2);

const m3 = (html.match(/shared vector store/gi) || []).length;
console.log('"shared vector store" mentions:', m3, '(should mostly be in "NOT-Anthropic" callouts)');

const m4 = (html.match(/40\+ fields[^a-z]*4\b/g) || []).length;
if (m4) issues.push('40+ -> 4 still present: ' + m4);

const m5 = (html.match(/Sonnet 4\.6 \/ Haiku 4\.5 = 2048/g) || []).length;
if (m5) issues.push('Haiku 4.5 wrong cache min: ' + m5);

const m6 = (html.match(/AgentDefinition[^"]*isolation/g) || []).length;
if (m6) issues.push('AgentDefinition with isolation: ' + m6);

const m7 = (html.match(/—/g) || []).length;
if (m7 > 0) issues.push('Em-dashes: ' + m7);

const grab = (s,e) => { const a = html.indexOf(s); const b = html.indexOf(e, a); return (new Function('return [' + html.slice(a + s.length, b) + ']'))(); };
try {
  const examQs = grab('const examQs = [', '];');
  const qaBankExtra = grab('const qaBankExtra = [', '];');
  const crashRows = grab('const crashRows = [', '];');
  const allCards = grab('const allCards = [', '];');
  console.log('\nData arrays parse OK:');
  console.log('  Flashcards:', allCards.length);
  console.log('  Practice Exam:', examQs.length);
  console.log('  Q&A Review:', examQs.length + qaBankExtra.length);
  console.log('  Quick Review:', crashRows.length);

  // Verify all qaBank entries still well-formed
  let bad = 0;
  for (const e of [...examQs, ...qaBankExtra]) {
    if (!e.q || !e.opts || e.opts.length !== 4 || typeof e.correct !== 'number') bad++;
  }
  console.log('  Malformed:', bad);
} catch (e) {
  issues.push('Parse error: ' + e.message);
}

console.log('\n=== Residual issues ===');
if (issues.length === 0) console.log('NONE');
else issues.forEach(i => console.log('  - ' + i));

console.log('\nFile size:', (html.length/1024).toFixed(1), 'KB');
