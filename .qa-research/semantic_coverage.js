// Smarter coverage check using concept aliases (forkSession ≈ fork_session, etc.)
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'claude-architect-study-guide 2.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const examStart = html.indexOf('const examQs = [');
const examEnd = html.indexOf('];', examStart);
const examQs = (new Function('return [' + html.slice(examStart + 'const examQs = ['.length, examEnd) + ']'))();
const extraStart = html.indexOf('const qaBankExtra = [');
const extraEnd = html.indexOf('];', extraStart);
const qaBankExtra = (new Function('return [' + html.slice(extraStart + 'const qaBankExtra = ['.length, extraEnd) + ']'))();
const qaBank = examQs.concat(qaBankExtra);

const crashStart = html.indexOf('const crashRows = [');
const crashEnd = html.indexOf('];\n', crashStart);
const crashRows = (new Function('return [' + html.slice(crashStart + 'const crashRows = ['.length, crashEnd) + ']'))();

// Define concept buckets — each bucket contains aliases that mean "the same thing".
// A question is COVERED if ANY of its concepts has an alias in Quick Review.
const conceptBuckets = [
  // === D1: Agentic ===
  { name: 'agentic loop / stop_reason', aliases: ['stop_reason','stop reasons','tool_use','end_turn','agentic loop'] },
  { name: 'subagent context isolation', aliases: ['subagent context','subagent isolation','no inheritance','only channel from parent'] },
  { name: 'Agent vs Task tool', aliases: ['agent tool','task tool','renamed','spawning subagent','allowedtools must include'] },
  { name: 'AgentDefinition fields', aliases: ['agentdefinition','description','prompt','tools','disallowedtools','model','effort','permissionmode','memory','isolation'] },
  { name: 'effort levels', aliases: ['effort','xhigh','low','medium','high','max'] },
  { name: 'hooks vs prompts', aliases: ['hooks','deterministic','probabilistic','prompts fail','enforcement'] },
  { name: 'hook events', aliases: ['pretooluse','posttooluse','sessionstart','stop','subagentstop','userpromptsubmit','precompact','posttoolbatch'] },
  { name: 'hook handler types', aliases: ['command','http','mcp_tool','prompt','agent','handler'] },
  { name: 'hook decisions / exit codes', aliases: ['allow','deny','ask','defer','exit code','permissiondecision'] },
  { name: 'sessions: continue/resume/fork', aliases: ['continue','resume','forksession','fork_session','fork session','continue_conversation'] },
  { name: 'session storage', aliases: ['session storage','jsonl','encoded-cwd','encoded cwd'] },
  { name: 'workflow patterns', aliases: ['workflow patterns','prompt chaining','routing','parallelization','orchestrator-workers','evaluator-optimizer'] },
  { name: 'multi-concern decomposition', aliases: ['multi-concern','decompose','parallel investigation','synthesize','unified resolution'] },
  { name: 'ResultMessage subtypes', aliases: ['resultmessage','subtype','success','error_max_turns','error_max_budget'] },
  { name: 'narrow decomposition risk', aliases: ['narrow decomposition','too narrow','coverage gaps','creative industries','visual arts'] },

  // === D2: Tools/MCP ===
  { name: 'tool description quality', aliases: ['tool description','description quality','3-4+ sentences','primary mechanism','what when when-not','selection factor'] },
  { name: 'tool definition fields', aliases: ['name','description','input_schema','input_examples','strict','cache_control','tool definition'] },
  { name: 'tool_choice values', aliases: ['tool_choice','auto','any','none','tool_choice values'] },
  { name: 'tool_choice + thinking incompat', aliases: ['incompatible with thinking','incompat with extended','only auto','only none','thinking on'] },
  { name: 'structured errors', aliases: ['is_error','errorcategory','isretryable','tool_result','structured error'] },
  { name: 'tool count / granularity', aliases: ['4-5','too many tools','consolidate','action parameter','granularity','kitchen-sink'] },
  { name: 'MCP transports', aliases: ['mcp transports','http','sse','stdio','streamable','websocket','deprecated'] },
  { name: 'MCP scopes', aliases: ['mcp scopes','local','project','user','global','renamed','.mcp.json'] },
  { name: 'env var substitution', aliases: ['${var}','${var:-','env var','substitution','expansion'] },
  { name: 'MCP tool naming', aliases: ['mcp__','double underscore','mcp tool naming','wildcard','allowedtools'] },
  { name: 'MCP roles (resources/tools/prompts)', aliases: ['resources','tools','prompts','sampling','mcp roles'] },
  { name: 'built-in CC tools', aliases: ['grep','glob','read','edit','write','bash','agent','webfetch','websearch','toolsearch','built-in'] },
  { name: 'access fail vs valid empty', aliases: ['valid empty','access failure','timeout','permission denied'] },
  { name: 'community vs custom MCP', aliases: ['community','custom','registered','third-party'] },
  { name: 'AskUserQuestion tool', aliases: ['askuserquestion','multiple-choice','user choice','in-loop'] }, // <-- LIKELY GAP

  // === D3: Claude Code ===
  { name: 'CLAUDE.md hierarchy', aliases: ['claude.md hierarchy','managed','project','user','local','concatenate'] },
  { name: 'imports', aliases: ['@import','recursive','5 hops','claudemdexcludes'] },
  { name: 'auto memory', aliases: ['auto memory','memory.md','200 lines','25kb'] },
  { name: 'skills (primary)', aliases: ['skill.md','.claude/skills','skills frontmatter','disable-model-invocation','user-invocable','context: fork'] },
  { name: 'skill substitutions', aliases: ['$arguments','${claude_skill_dir}','${claude_session_id}','$0','$1','$2'] },
  { name: 'skill precedence', aliases: ['enterprise','personal','project','plugin','namespaced'] },
  { name: 'sub-agents config', aliases: ['.claude/agents','sub-agent','agent frontmatter','isolation','color','background'] },
  { name: 'plugins', aliases: ['plugin.json','.claude-plugin','${claude_plugin_root}','plugin manifest'] },
  { name: '.claude/rules with paths', aliases: ['.claude/rules','paths:','glob','path-scoped','conditional loading'] },
  { name: 'plan mode vs direct', aliases: ['plan mode','direct execution','exitplanmode'] },
  { name: 'CI flags', aliases: ['-p','--print','--bare','--output-format','--json-schema','--max-turns','headless'] },
  { name: 'permission modes', aliases: ['permission mode','default','acceptedits','plan','auto','dontask','bypasspermissions'] },
  { name: 'team config diagnosis', aliases: ['user-level','team-shared','/memory','/init'] },
  { name: 'self-review separate session', aliases: ['self-review','independent reviewer','separate session'] },
  { name: 'CI dedup prior findings', aliases: ['prior findings','include in context','re-run','duplicate'] },

  // === D4: Prompts ===
  { name: 'specific not vague', aliases: ['specific','vague','literal','be conservative','high-confidence'] },
  { name: 'few-shot count', aliases: ['few-shot','3-5 examples','multishot','<example>'] },
  { name: 'XML tags', aliases: ['xml tags','<instructions>','<context>','<documents>','<quotes>','<thinking>','<answer>'] },
  { name: 'long-context placement', aliases: ['top of prompt','documents at top','query at end','30%','lost in the middle'] },
  { name: 'adaptive thinking', aliases: ['adaptive thinking','thinking: adaptive','effort levels','budget_tokens'] },
  { name: 'prefilling deprecated', aliases: ['prefill','prefilling','deprecated','last assistant turn','400 error'] },
  { name: 'Structured Outputs GA', aliases: ['structured outputs','output_config','format','strict tools','pydantic','zodoutputformat'] },
  { name: 'tool_use semantic vs syntactic', aliases: ['syntax errors','semantic errors','schema-compliant'] },
  { name: 'optional/nullable fields', aliases: ['optional','nullable','prevent fabrication','return null'] },
  { name: 'schema redundancy', aliases: ['schema redundancy','calculated_total','stated_total'] },
  { name: 'resilient enum', aliases: ['resilient enum','other','detail string','enum + other'] },
  { name: 'validation retry', aliases: ['validation retry','retry-with-error','format errors','missing information'] },
  { name: 'Batch API', aliases: ['batch api','50%','100,000','256 mb','24-hour','29 days','custom_id','zdr'] },
  { name: 'multi-pass review', aliases: ['multi-pass','per-file','cross-file','integration pass'] },
  { name: 'Citations', aliases: ['citations','char_location','page_location','content_block_location','cited_text','enabled: true'] },
  { name: 'detected_pattern field', aliases: ['detected_pattern','false positive'] },

  // === D5: Context ===
  { name: '1M context GA', aliases: ['1m context','opus 4.7','opus 4.6','sonnet 4.6','no beta header','standard pricing','haiku 4.5'] },
  { name: 'lost in middle', aliases: ['lost in the middle','place key summaries','section headers','ground in <quotes>'] },
  { name: 'tool result accumulation', aliases: ['tool result accumulation','40+ fields','case facts','trim verbose'] },
  { name: 'escalation triggers', aliases: ['escalation','explicit human request','policy gap','no progress','sentiment','self-confidence'] },
  { name: 'error propagation', aliases: ['error propagation','failure type','attempted action','partial results'] },
  { name: 'conflicting sources', aliases: ['conflicting','attribution','dates','annotate'] },
  { name: 'scratchpad', aliases: ['scratchpad','context degradation'] },
  { name: 'memory tool', aliases: ['memory tool','memory_20250818','/memories','client-side','six commands'] },
  { name: 'compaction beta', aliases: ['compaction','compact-2026-01-12','compact_20260112'] },
  { name: 'prompt caching', aliases: ['prompt caching','cache_control','breakpoints','ephemeral','cache hierarchy'] },
  { name: 'cache TTL', aliases: ['ttl','5-min','1-hour','1h','5m','before 5m','ordering rule'] },
  { name: 'cache pricing', aliases: ['1.25x','2x','0.1x','cache write','cache read'] },
  { name: 'cache minimums', aliases: ['4096 tokens','2048 tokens','minimum cacheable','below-min'] },
  { name: 'pause_turn', aliases: ['pause_turn','server tool','10-iteration','resend unchanged'] },
  { name: 'context engineering pillars', aliases: ['just-in-time retrieval','structured note-taking','sub-agent isolation','context engineering'] },
];

// Build crashRow text (lowercase, all sections)
const crashFullText = crashRows.map(r => (r.key + ' ' + r.val + ' ' + (r.section || '')).toLowerCase()).join(' || ');

// For each bucket, check if Quick Review covers it
const bucketCoverage = {};
for (const b of conceptBuckets) {
  const covered = b.aliases.some(a => crashFullText.includes(a.toLowerCase()));
  bucketCoverage[b.name] = covered;
}

console.log('=== Concept Bucket Coverage by Quick Review ===');
let coveredCount = 0;
for (const [name, covered] of Object.entries(bucketCoverage)) {
  console.log(`  ${covered ? '[COVERED]' : '[ MISS  ]'} ${name}`);
  if (covered) coveredCount++;
}
console.log(`\n${coveredCount}/${conceptBuckets.length} concept buckets covered (${(coveredCount/conceptBuckets.length*100).toFixed(0)}%)`);

// For each Q&A, find which concept bucket it belongs to (best-fit)
function classify(q) {
  const text = (q.q + ' ' + q.opts.join(' ') + ' ' + (q.explain || '')).toLowerCase();
  let bestBucket = null;
  let bestScore = 0;
  for (const b of conceptBuckets) {
    const matches = b.aliases.filter(a => text.includes(a.toLowerCase())).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestBucket = b;
    }
  }
  return bestBucket;
}

// Compute per-question coverage based on bucket
const uncoveredBuckets = new Set();
let qCovered = 0, qUncovered = 0, qUnclassified = 0;
const uncoveredQs = [];
for (const q of qaBank) {
  const b = classify(q);
  if (!b) {
    qUnclassified++;
    continue;
  }
  if (bucketCoverage[b.name]) {
    qCovered++;
  } else {
    qUncovered++;
    uncoveredBuckets.add(b.name);
    uncoveredQs.push({ bucket: b.name, q: q.q.slice(0, 80), domain: q.domain });
  }
}

console.log(`\n=== Question Coverage ===`);
console.log(`Covered: ${qCovered}/${qaBank.length} (${(qCovered/qaBank.length*100).toFixed(1)}%)`);
console.log(`Uncovered: ${qUncovered}`);
console.log(`Unclassified (concept not in bucket list): ${qUnclassified}`);

if (uncoveredBuckets.size > 0) {
  console.log(`\n=== Uncovered Concept Buckets (REAL GAPS) ===`);
  const counts = {};
  for (const u of uncoveredQs) counts[u.bucket] = (counts[u.bucket] || 0) + 1;
  for (const [name, count] of Object.entries(counts).sort((a,b) => b[1]-a[1])) {
    console.log(`  [${count}x] ${name}`);
  }
  console.log(`\n=== Sample uncovered questions ===`);
  for (const u of uncoveredQs.slice(0, 10)) {
    console.log(`  [${u.domain}] ${u.q}\n    bucket: ${u.bucket}`);
  }
}

fs.writeFileSync(path.join(__dirname, 'semantic_coverage.json'), JSON.stringify({
  bucketCoverage,
  qCovered, qUncovered, qUnclassified,
  uncoveredQs: uncoveredQs.slice(0, 50),
}, null, 2));
