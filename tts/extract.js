// Parses ../claude-architect-study-guide 2.html → scripts/<bucket>.txt
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as cheerio from "cheerio";

const HTML_PATH = path.resolve("../claude-architect-study-guide 2.html");
const OUT_DIR = path.resolve("scripts");
fs.mkdirSync(OUT_DIR, { recursive: true });

const html = fs.readFileSync(HTML_PATH, "utf8");

// ---------- helpers ----------

function extractArrayLiteral(src, declName) {
  const start = src.indexOf(`${declName} = [`);
  if (start < 0) throw new Error(`Could not find ${declName}`);
  const openIdx = src.indexOf("[", start);
  let depth = 0, inStr = null, esc = false, i = openIdx;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(openIdx, i);
}

function evalArray(literal) {
  return vm.runInNewContext("(" + literal + ")", {}, { timeout: 1000 });
}

// Convert an HTML snippet (as found in crashRows.val etc.) into spoken text.
function toNarration(snippet) {
  if (!snippet) return "";
  // Replace symbol-y bits BEFORE entity decode so we can normalize uniformly.
  let s = String(snippet)
    .replace(/<code>([^<]*)<\/code>/g, "$1")
    .replace(/<strong>([^<]*?):<\/strong>/g, "$1:")
    .replace(/<strong>([^<]*?)<\/strong>/g, "$1")
    .replace(/<em>([^<]*?)<\/em>/g, "$1")
    .replace(/<span[^>]*class="[^"]*\b(?:new-tag|new)\b[^"]*"[^>]*>[^<]*<\/span>/g, " ")
    .replace(/<span[^>]*>([^<]*)<\/span>/g, " $1 ")
    .replace(/<br\s*\/?>/g, ". ")
    .replace(/<\/p>\s*<p[^>]*>/g, ". ")
    .replace(/<[^>]+>/g, "");
  // Decode entities via cheerio.
  s = cheerio.load(`<x>${s}</x>`, null, false)("x").text();
  // Symbol → words.
  s = s
    .replace(/→|↦|⇒/g, " then ")
    .replace(/←/g, " from ")
    .replace(/↔/g, " equals ")
    .replace(/&/g, " and ")
    .replace(/\|/g, " or ")
    .replace(/~/g, "about ")
    .replace(/·/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
  if (s && !/[.!?]$/.test(s)) s += ".";
  return s;
}

// ---------- bucket setup ----------

const BUCKETS = {
  "d1-agentic":     { label: "Domain 1, Agentic Architecture and Orchestration", items: [] },
  "d2-tools-mcp":   { label: "Domain 2, Tool Design and MCP Integration",        items: [] },
  "d3-claude-code": { label: "Domain 3, Claude Code Configuration and Workflows",items: [] },
  "d4-prompts":     { label: "Domain 4, Prompt Engineering and Structured Output", items: [] },
  "d5-context":     { label: "Domain 5, Context Management and Reliability",     items: [] },
  "playbook":       { label: "Architect's Playbook and Hands-On Exercises",      items: [] },
  "ref2026":        { label: "2026 Reference Card, What's New Since 2025",       items: [] },
  "exam-overview":  { label: "Exam Reference, Official Scope and Structure",     items: [] },
};

const dKey = {
  d1: "d1-agentic", d2: "d2-tools-mcp", d3: "d3-claude-code",
  d4: "d4-prompts", d5: "d5-context", pb: "playbook", ref: "ref2026",
};

// ---------- 1. crashRows ----------

{
  const lit = extractArrayLiteral(html, "const crashRows");
  const rows = evalArray(lit);
  for (const r of rows) {
    const bucket = dKey[r.d];
    if (!bucket) continue;
    const key = toNarration(r.key);
    const val = toNarration(r.val);
    BUCKETS[bucket].items.push({ src: "crash", text: `${key.replace(/\.$/, "")}. ${val}` });
  }
}

// ---------- 2. qaBankExtra ----------

{
  const lit = extractArrayLiteral(html, "const qaBankExtra");
  const rows = evalArray(lit);
  for (const r of rows) {
    const bucket = dKey[r.domain];
    if (!bucket) continue;
    const scenario = toNarration(r.scenario);
    const q = toNarration(r.q);
    const answer = toNarration(r.opts[r.correct]);
    const why = toNarration(r.explain);
    BUCKETS[bucket].items.push({
      src: "qa",
      text: `Scenario, ${scenario} Question, ${q} Answer, ${answer} Why, ${why}`,
    });
  }
}

// ---------- 3. Cheat-sheet prose ----------

{
  const $ = cheerio.load(html);
  $("#sheet .sheet-domain").each((_, el) => {
    const heading = $(el).find("h3").first().text().trim();
    let bucket = null;
    if (/Domain 1/i.test(heading)) bucket = "d1-agentic";
    else if (/Domain 2/i.test(heading)) bucket = "d2-tools-mcp";
    else if (/Domain 3/i.test(heading)) bucket = "d3-claude-code";
    else if (/Domain 4/i.test(heading)) bucket = "d4-prompts";
    else if (/Domain 5/i.test(heading)) bucket = "d5-context";
    else if (/Playbook|Hands-On/i.test(heading)) bucket = "playbook";
    else if (/2026 Reference/i.test(heading)) bucket = "ref2026";
    else if (/Exam Reference/i.test(heading)) bucket = "exam-overview";
    else return; // skip tables / matrix
    const items = [];
    $(el).find(".sheet-item").each((_, it) => {
      const inner = $(it).html() || "";
      const t = toNarration(inner);
      if (t) items.push(t);
    });
    // Cheat sheet first → drill rows next, so prepend.
    BUCKETS[bucket].items = [
      { src: "sheet", text: `${heading.replace(/\([^)]*\)\s*$/, "").trim()}. ${items.join(" ")}` },
      ...BUCKETS[bucket].items,
    ];
  });
}

// ---------- write scripts ----------

let totalChars = 0;
const summary = [];
for (const [key, b] of Object.entries(BUCKETS)) {
  const sections = {
    sheet: b.items.filter(x => x.src === "sheet").map(x => x.text),
    crash: b.items.filter(x => x.src === "crash").map(x => x.text),
    qa:    b.items.filter(x => x.src === "qa").map(x => x.text),
  };
  const parts = [];
  parts.push(`${b.label}.`);
  if (sections.sheet.length) {
    parts.push("Section one, cheat sheet.");
    parts.push(sections.sheet.join("\n\n"));
  }
  if (sections.crash.length) {
    parts.push("Section two, quick review.");
    parts.push(sections.crash.join("\n\n"));
  }
  if (sections.qa.length) {
    parts.push("Section three, question and answer review.");
    parts.push(sections.qa.join("\n\n"));
  }
  parts.push("End of section.");
  const text = parts.join("\n\n");
  const file = path.join(OUT_DIR, `${key}.txt`);
  fs.writeFileSync(file, text, "utf8");
  totalChars += text.length;
  summary.push({ key, chars: text.length, sheet: sections.sheet.length, crash: sections.crash.length, qa: sections.qa.length });
}

const costHd = (totalChars / 1_000_000) * 30;
const costStd = (totalChars / 1_000_000) * 15;

console.log("\nWrote", Object.keys(BUCKETS).length, "scripts to", OUT_DIR);
console.table(summary);
console.log(`Total characters: ${totalChars.toLocaleString()}`);
console.log(`Estimated cost: $${costStd.toFixed(2)} (tts-1) / $${costHd.toFixed(2)} (tts-1-hd)`);
console.log("\nReview the .txt files. When happy: npm run sample, then npm run generate.");
