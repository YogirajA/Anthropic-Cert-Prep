// Phase 2: Playbook fixes + cleanups + restore confirmed specifics.
const fs = require('fs');
const path = require('path');
const htmlPath = path.join(__dirname, '..', 'claude-architect-study-guide 2.html');
let html = fs.readFileSync(htmlPath, 'utf8');
let fixCount = 0;

function rep(needle, replacement, label) {
  if (typeof needle === 'string') {
    if (!html.includes(needle)) {
      console.error(`  MISS: ${label}`);
      return false;
    }
    html = html.split(needle).join(replacement);
  } else {
    if (!needle.test(html)) {
      console.error(`  MISS: ${label}`);
      return false;
    }
    html = html.replace(needle, replacement);
  }
  fixCount++;
  console.log(`  OK:   ${label}`);
  return true;
}

console.log('=== PB-002: "~3%" fabricated failure rate (5 occurrences) ===');
rep('emphatic system prompts still fail ~3% of the time on compliance-critical operations', 'emphatic system prompts still have a non-zero failure rate on compliance-critical operations (per PDF Task 1.4)', 'PB-002a sheet item');
rep('emphatic system prompts still fail ~3% of the time. Use hooks (or tool_choice) when business rules require guarantees', 'emphatic system prompts still have a non-zero failure rate. Use hooks (or tool_choice) when business rules require guarantees', 'PB-002b D1 flashcard');
rep("Relying on emphatic system prompts ('CRITICAL POLICY: NEVER process >$500') still yields ~3% failure", "Relying on emphatic system prompts ('CRITICAL POLICY: NEVER process >$500') has a non-zero failure rate", 'PB-002c playbook flashcard');
rep('Even emphatic system prompts still fail ~3% on compliance-critical operations.', 'Even emphatic system prompts have a non-zero failure rate on compliance-critical operations.', 'PB-002d examQs explain');
rep('Emphatic prompts still fail ~3%. Use hooks (<code>PreToolUse</code>', 'Emphatic prompts have a non-zero failure rate. Use hooks (<code>PreToolUse</code>', 'PB-002e playbook sheet');
rep('Hooks are DETERMINISTIC (out-of-context handlers). Prompts probabilistic: emphatic system prompts still fail ~3% on compliance.', 'Hooks are DETERMINISTIC (out-of-context handlers). Prompts probabilistic: emphatic system prompts have a non-zero failure rate on compliance.', 'PB-002f Quick Review hooks-vs-prompts');
rep('"CRITICAL: NEVER process &gt;$500" still fails ~3%. Use hooks or <code>tool_choice</code> to enforce.', '"CRITICAL: NEVER process &gt;$500" still has a non-zero failure rate. Use hooks or <code>tool_choice</code> to enforce.', 'PB-002g anti-pattern row');
rep('Hooks intercept tool calls server-side. Emphatic prompts still fail ~3%. Remove model discretion entirely.', 'Hooks intercept tool calls server-side. Emphatic prompts have a non-zero failure rate. Remove model discretion entirely.', 'PB-002h playbook crash');

console.log('\n=== PB-008: Daisy-chained logs anti-pattern still says "shared vector store" ===');
rep('Full conversation logs between subagents = exponential token cost. Use shared vector store/files.', 'Full conversation logs between subagents = exponential token cost. Use a filesystem/artifact store: subagents write outputs and pass lightweight references back to the lead.', 'PB-008 anti-pattern row');

console.log('\n=== PB-007: Production Architecture Blueprint - "shared memory" residue ===');
rep('State layer handles pruning + shared memory.', 'State layer handles pruning + lead-coordinator state via filesystem artifacts (not shared memory between subagents).', 'PB-007 production blueprint');

console.log('\n=== PB-003: "40+ fields → 4 relevant" should be 5 per PDF page 21 ===');
rep('Trim verbose tool outputs (40+ fields &rarr; 4 relevant) before they hit context.', 'Trim verbose tool outputs (40+ fields &rarr; ~5 relevant) before they hit context.', 'PB-003a context preservation');
rep('Filter verbose responses (40+ fields &rarr; 4 relevant) app-side BEFORE they enter context.', 'Filter verbose responses (40+ fields &rarr; ~5 relevant) app-side BEFORE they enter context.', 'PB-003b playbook crash');
rep('Filter verbose tool responses (40+ fields &rarr; 4 relevant) application-side before they enter context.', 'Filter verbose tool responses (40+ fields &rarr; ~5 relevant) application-side before they enter context.', 'PB-003c sheet item');
rep('Trim 40+ fields &rarr; 4 relevant. Persistent', 'Trim 40+ fields &rarr; ~5 relevant. Persistent', 'PB-003d Quick Review');
rep('only relevant fields (40+ fields → 4 needed)', 'only relevant fields (40+ fields → ~5 needed)', 'PB-003e flashcard');

console.log('\n=== PB-005: "filter tool_result on resume" - label as community pattern ===');
rep('Resume with full conversation history, but programmatically filter out previous tool_result messages. Keep human/assistant turns. Forces the agent to re-fetch needed data on resumption. Returning customers always receive fresh, current information.', 'Two valid options. Anthropic-canonical (PDF Task 1.7): start a fresh session with a structured summary of key facts, since stale tool_results are unreliable. Community pattern: resume with full history but programmatically filter out previous tool_result messages while keeping human/assistant turns; the agent re-fetches data on next call. Both ensure returning customers receive current information.', 'PB-005 resume async');

console.log('\n=== PB-006/PB-001: Label third-party framings ===');
rep("Architect's Playbook: Design Patterns &amp; Anti-Patterns", "Architect's Playbook: Design Patterns &amp; Anti-Patterns (mix of PDF + third-party)", 'PB-001/006 section header');
rep('<strong>4 Constraint Dimensions:</strong> Latency &rarr; parallelization &amp; caching. Accuracy &rarr; structured intermediates &amp; few-shot. Cost &rarr; Batch APIs &amp; context pruning. Compliance &rarr; application-layer intercepts (NEVER prompts).', '<strong>4 Constraint Dimensions</strong> <em>(third-party framing)</em>: Latency &rarr; parallelization &amp; caching. Accuracy &rarr; structured intermediates &amp; few-shot. Cost &rarr; Batch APIs &amp; context pruning. Compliance &rarr; application-layer intercepts (NEVER prompts). Anthropic explicitly names only the latency/cost tradeoff in "Building Effective Agents"; accuracy and compliance are scaffolding added by the third-party Playbook.', 'PB-001 4-dim label');

console.log('\n=== PB-004: MCP Tool Granularity - balance with consolidation ===');
rep('<strong>MCP Tool Granularity:</strong> Split monolithic tools into single-purpose tools. Enhance descriptions. Agents default to familiar built-ins (Grep) when custom tools are vaguely described. But avoid micro-fragmentation: consolidate related ops with an <code>action</code> param.', '<strong>MCP Tool Granularity (right-size, don\'t over-split):</strong> Anthropic\'s "Writing Tools for Agents" recommends consolidating related ops (e.g., schedule_event combining list_users/list_events/create_event). Split into focused tools when descriptions overlap; consolidate when steps belong to one workflow. Improving descriptions often beats splitting. Agents default to familiar built-ins (Grep) when custom tools are vaguely described.', 'PB-004a sheet item');
rep('Split monolithic tools into single-purpose tools. Enhance descriptions. Agents default to familiar built-ins (Grep) when custom tools are vaguely described. But avoid micro-fragmentation: consolidate related ops with an <code>action</code> param.', 'Right-size to the agent\'s role. Per Anthropic\'s "Writing Tools for Agents", consolidate related ops by default (e.g., schedule_event over list_users/create_event). Split only when descriptions overlap. Agents default to familiar built-ins (Grep) when custom tools are vaguely described; richer descriptions often beat splitting.', 'PB-004b playbook crash');

console.log('\n=== PB-009: "game of telephone" quote - paraphrase ===');
rep('subagents write outputs to a filesystem and pass lightweight references back to the lead to avoid the "game of telephone."', 'subagents write outputs to a filesystem and pass lightweight references back to the lead to minimize information loss during multi-stage processing (the blog\'s framing).', 'PB-009a sheet item');

console.log('\n=== Restore PDF-confirmed specifics that I previously softened ===');
rep('Memory tool (GA, 2026)', 'Memory tool (GA Feb 17, 2026)', 'Restore Memory tool GA date - cheat sheet');
rep("Sonnet 4.5's earlier 1M context beta has been retired in 2026; only Opus 4.7, Opus 4.6, and Sonnet 4.6 retain 1M GA", "Sonnet 4.5's 1M beta (context-1m-2025-08-07) was retired April 30, 2026. Only Opus 4.7, Opus 4.6, and Sonnet 4.6 retain 1M GA.", 'Restore Sonnet 4.5 retirement details');

console.log('\n=== Missed acceptEdits cleanups ===');
rep('acceptEdits auto-approves edits + filesystem commands (mkdir/touch/rm/mv/cp/sed). bypassPermissions allows everything', 'acceptEdits auto-approves edits + filesystem commands such as mkdir/touch/mv/cp (other shell commands need explicit allow rules). bypassPermissions allows everything', 'D3.1z dontAsk flashcard');
rep('<code>acceptEdits</code> (edits + mkdir/touch/rm/mv/cp/sed)', '<code>acceptEdits</code> (edits + filesystem commands such as mkdir/touch/mv/cp; other shell commands need explicit allow rules)', 'D3.1y permission modes Quick Review');

console.log('\n=== Missed Q25 examQs explanation ===');
rep("A shared vector store decouples state from invocation, agents write findings and read only what's relevant via semantic search. Prevents exponential token scaling and protects against state loss on crashes. This is the pattern Anthropic's own multi-agent research system uses. Summarization loses detail; truncation loses early findings; no shared context misses cross-agent dependencies.",
"Decouple state from invocation: subagents write findings to durable storage (filesystem artifacts) and pass lightweight references to the lead. Per Anthropic's multi-agent research blog, subagents do NOT share memory directly; they return findings to the lead, and the lead persists its plan to memory to survive long contexts. The 'subagent output to filesystem' pattern in Anthropic's appendix is the canonical match. Either approach prevents exponential token scaling vs daisy-chaining full conversation logs.",
'D1.3 Q25 examQs');

console.log('\n=== Cache minimums missed flashcard ===');
rep("Trim verbose tool outputs application-side to only relevant fields (40+ fields → ~5 needed). Extract key facts into a persistent 'case facts' block. For long sessions, use the memory tool or scratchpad files.", "Trim verbose tool outputs application-side to only relevant fields (40+ fields → ~5 needed; per PDF page 21 example). Extract key facts into a persistent 'case facts' block. For long sessions, use the memory tool or scratchpad files.", 'D5 flashcard cache fields tweak (no-op if already)');

// Reference Matrix in Q&A bank still says "shared vector store" — patch
rep("Token Bloat → strict schemas, filter stale results, scratchpad/memory, shared vector store.", "Token Bloat → strict schemas, filter stale results, scratchpad/memory, filesystem-artifact store (lead-coordinator pattern; not a shared vector store between subagents).", 'Reference Matrix vector store');

console.log(`\n=== Phase 2 summary: ${fixCount} fixes ===`);
fs.writeFileSync(htmlPath, html);
console.log('Saved.');
