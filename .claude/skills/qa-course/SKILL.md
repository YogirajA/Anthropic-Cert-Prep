---
name: qa-course
description: >-
  Audit / QA THIS repo's Claude Certified Architect – Foundations (CCA-F) study guide for CORRECTNESS and
  HALLUCINATIONS — cross-check every factual claim against official Anthropic docs and report findings.
  Use whenever the user asks to "QA the course", "audit the guide", "fact-check the coursework", "check for
  hallucinations", "is the guide correct / accurate", "verify the content against the docs", "find wrong
  answers", or wants confidence the study material is trustworthy before relying on it — even if they don't
  say "skill". This is READ-ONLY: it produces a findings report and does NOT edit the guide. It is the
  inspection counterpart to `/update-course` (which makes the changes); run this to find problems, then hand
  the confirmed fixes to `/update-course` to apply. Prefer this over a generic re-read for any
  "check it's right / hunt for hallucinations" request in this repo.
---

# QA the CCA-F study guide (read-only audit)

## Goal & boundary
Find everything wrong: hallucinations (invented beta headers / flags / fields, fake model-support lists,
made-up commands), incorrect facts, wrong Q&A answer keys, and cross-tab contradictions — each judged against
**official Anthropic docs**, not memory. **Do not edit the guide.** Output is a findings report; the user (or
`/update-course`) decides what to change. The point of separating audit from edit is honesty: an auditor that
also rewrites is tempted to rationalise; keep the two roles distinct.

Content lives in `claude-architect-study-guide 2.html` (`allCards`, `examQs`, `qaBankExtra`, `crashRows`,
and `#sheet` / `#ccref` / `#commands`). See `CLAUDE.md` for the layout.

## Workflow

### 1. Structural baseline (free, instant)
`node .claude/skills/update-course/scripts/verify.mjs` — confirms JS parses, arrays load, every Q&A `correct`
index is in range, counts match, tabs are wired, scripts match the bank, and no unescaped literal-XML tags.
Any failure here is a definite bug; record it. (This checks STRUCTURE, not whether facts are true.)

### 2. Turn the guide into a finite checklist
`node .claude/skills/qa-course/scripts/extract-claims.mjs` — prints the de-duplicated, hallucination-prone,
doc-checkable claims grouped by type (beta headers, model IDs, versioned tool IDs, CLI flags, spec dates,
prices, numeric limits) with a sample line number each. This converts "audit everything" into "verify these N
concrete claims." The script also lists the read-only categories (model-support lists, answer keys,
contradictions) that regex can't extract.

### 3. Establish ground truth
Invoke the `claude-api` skill for the authoritative model lineup / IDs / behaviour. For everything numeric or
list-shaped, `WebFetch` the specific official page — do not trust memory or a single subagent's summary:
- `platform.claude.com/docs` — models, pricing, context/output caps, prompt caching minimums, beta headers,
  structured outputs, batch/files limits, compaction, task budgets, refusals.
- `code.claude.com/docs` — Claude Code (permission modes, hooks, settings keys, subagents, skills, CLI flags),
  Agent SDK.
- `modelcontextprotocol.io` — MCP spec version, transports, tool-response shape, scopes.

### 4. Verify — fan out and be adversarial
For a thorough pass, dispatch verification subagents in parallel (this is the proven pattern), each owning an
area and told to cite live docs:
- **Model & API facts** (D4/D5 + Absolute-Numbers tables + 2026 reference): every beta header, numeric limit,
  model-support list, price.
- **Claude Code / Agent SDK / MCP** (D1/D2/D3 + CC Reference + Commands): permission modes, hook events,
  settings/frontmatter keys, CLI flags, MCP spec/transports, tool names.
- **Answer-key correctness**: for a sample (and all numeric/factual ones), is the keyed `correct` option
  actually right per docs? Are distractors plausibly wrong (not accidentally true)?
- **Community/social cross-check** (optional): are any circulating claims (exam logistics, mnemonics) wrongly
  presented as official?

Make each verifier try to **refute** the claim, not confirm it. When a live doc and a subagent disagree, the
live doc wins. Give every high-risk claim a verdict: **CONFIRMED / WRONG / UNVERIFIABLE**, each with a URL.

### 5. Internal consistency
The same fact must read identically in every tab and in the Absolute-Numbers tables — grep the value across the
whole file and diff the statements. List every contradiction (these are bugs even if you can't reach a doc).

### 6. Known hallucination patterns to hunt explicitly
- Invented **beta headers** or wrong date suffixes; a feature claimed beta when it's GA (or vice-versa).
- **Fake CLI flags** used as real (e.g. `--batch`, `--headless`). NOTE: these legitimately appear as
  intentional WRONG-answer distractors — that's correct; only flag them when presented as fact.
- **Wrong model-support lists** (a feature attributed to a model that doesn't support it, or omitting one
  that does) and stale "newest model" framing.
- **Community mnemonics as official** (CALM / SPIDER / PRECISE) and **made-up API fields** presented as
  built-in (vs. a legitimate design *pattern*).
- **Retired/invented model IDs** outside the typo-distractor question.

## Scope note
The exam is **model-version-agnostic** — it tests judgment, not which model is newest, and not pricing. Flag
stale/incorrect model facts (they erode trust), but don't treat new-model trivia as exam-tested, and label
pricing/limits as "context, out of exam scope" where the guide already does.

## Output — the findings report
Present a table: **Claim | Where (tab / line) | Verdict (CONFIRMED / WRONG / UNVERIFIABLE) | Source URL |
Correction**. List WRONG and UNVERIFIABLE first; then contradictions; then a one-line health verdict. Be
conservative: WRONG only when a doc contradicts it; UNVERIFIABLE when no doc settles it. Optionally save the
report under `.qa-research/` (git-tracked) for the record.

Then **offer to hand the confirmed fixes to `/update-course`** to apply — do not edit the guide yourself.

## Definition of done
`verify.mjs` run · every extracted claim has a verdict + citation (or is explicitly deferred) · model-support
lists, answer keys, and cross-tab contradictions reviewed · findings report delivered · guide left unmodified.
