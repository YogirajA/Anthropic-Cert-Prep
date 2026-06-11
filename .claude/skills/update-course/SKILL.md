---
name: update-course
description: >-
  Bring THIS repo's Claude Certified Architect – Foundations (CCA-F) study guide fully up to date and
  verify it end to end. Use whenever the user asks to update / refresh / fact-check / "bring up to date" /
  "check the course" / fix the study guide, the exam prep, the flashcards/Q&A/cheat-sheet, OR after any new
  Anthropic release (a new Claude model, Claude Code feature, MCP spec, API change) that could affect the
  guide — even if they don't say the word "skill". This is the single source of truth for how an "update" is
  done here: it is NOT enough to edit one tab. Every tab must end up accurate, consistent, and gap-free, with
  facts verified against official Anthropic docs. Always run this skill for content-update requests in this repo.
---

# Update the CCA-F study guide

## The golden rule — accuracy everywhere, ZERO gaps
This is an exam study kit. It is only useful if it is accurate *everywhere*. Updating one tab, or only the
obvious spots, is a failure. The same fact appears in many places; if you change it in one, you must change it
in all. The user's standing instruction: "all tabs must be up to date, nothing should have gaps… otherwise
this guide is not useful." Read `CLAUDE.md` in the repo root — it states this rule and is authoritative.

## Where the content lives (all in `claude-architect-study-guide 2.html`)
The note the filename has a space. JS data arrays near the bottom of the file:
- `allCards` → **Flashcards**
- `examQs` → **Practice Exam**
- `qaBankExtra` (~650 items) → most of **Q&A Review** (`qaBank = examQs.concat(qaBankExtra)`)
- `crashRows` → **Quick Review**

Static HTML sections: `#sheet` (**Cheat Sheet**, incl. the 2026 reference card), `#ccref` (**CC Reference** +
the "Absolute Numbers" tables), `#commands` (**Commands** — advanced Claude Code, enrichment only).

A single fact (e.g. "which models support compaction", a cache minimum, an output cap) typically appears across
the cheat sheet, crash rows, flashcards, the Q&A bank, AND the reference tables. Grep the whole file for the old
value and fix every occurrence, in every array and every tab.

## Workflow

### 1. Establish ground truth — never trust memory
Model IDs, beta-header strings, numeric limits, and "which models support feature X" lists drift constantly and
are exactly where hallucinations hide. Before editing:
- Invoke the `claude-api` skill for the authoritative current model lineup / IDs / behaviour.
- `WebFetch` the specific official pages for anything numeric or list-shaped (e.g.
  `platform.claude.com/docs/.../prompt-caching` for cache minimums, the models/pricing page for context/output
  caps and pricing, `code.claude.com/docs` for Claude Code, `modelcontextprotocol.io` for the MCP spec).
- For a broad refresh, fan out research subagents (model/API facts · Claude Code/SDK · MCP · exam scope &
  community reports), each told to cite live docs and flag anything unverifiable. Cross-check their claims —
  prefer the live doc over a subagent's summary when they conflict.

### 2. Decide what actually changed, and what's in scope
The exam is **model-version-agnostic** — it tests architectural judgment, the agentic loop, MCP/SDK mechanics,
prompting and context patterns, NOT which model is newest, and not pricing. So:
- Fix stale facts and contradictions, and keep the model lineup current for *context*, but do **not** add
  new-model trivia as if it were tested. Label new-model / advanced-command content "context only / not
  exam-tested" (see the existing model-agnostic note in `#sheet` and the Commands-tab banner).
- When unsure whether something is on the blueprint, say so rather than presenting a guess as fact.

### 3. Edit every content store
Apply each change consistently across `allCards`, `examQs`, `qaBankExtra`, `crashRows`, `#sheet`, `#ccref`,
and `#commands`. Watch for:
- **Model-support lists** (1M context, compaction, output caps, prefill removal, interleaved/adaptive thinking,
  effort tiers) — extend/correct them everywhere.
- **Q&A correct answers**: if a numeric fact changes, a question's keyed `correct` index may now be wrong.
  Update `correct` AND the explanation AND the option text together. (This has bitten us — e.g. cache minimums.)
- **Distractors are not bugs**: wrong-answer options (a fake `--batch` flag, an outdated value) are intentional.
  Don't "fix" a deliberately-wrong option; only fix the keyed-correct answer and explanations.
- **Internal contradictions**: the same fact must read identically across tabs and the Absolute-Numbers tables.

### 4. Verify — do not skip
- Run the bundled checker: `node .claude/skills/update-course/scripts/verify.mjs` (from the repo root). It
  confirms the JS parses, the arrays load, every question's `correct` index is in range, the badge/header counts
  match the data, all tabs are wired, and the TTS scripts match the bank. It exits non-zero on any failure.
- Grep the whole file for the *old* value(s) you replaced → confirm zero stragglers (mind substring
  false-positives: "Opus 4.7, Opus 4.6" is a substring of the correct "Opus 4.8, Opus 4.7, Opus 4.6" — filter
  with a `grep -v 4\.8`).
- Browser smoke-test (catches runtime/render issues `verify.mjs` can't): serve the folder and drive it with the
  playwright MCP — `file://` is blocked, so `python -m http.server 8765` then open
  `http://localhost:8765/claude-architect-study-guide%202.html`. Click through all 8 tabs (or call
  `showSection` for each via `browser_evaluate`), confirm each renders non-empty and the console has no errors
  beyond the harmless `favicon.ico` 404.

### 5. Regenerate the TTS scripts and commit them
The spoken scripts derive from `#sheet` + `crashRows` + `qaBankExtra`, so any content change must flow through:
`cd tts && npm run extract`. **`tts/scripts/*.txt` are tracked in git — commit them** so their answers/numbers
stay in sync with the bank. `tts/audio/` stays git-ignored (large, regenerable; `npm run generate` is a paid
OpenAI call — only run it with the user's go-ahead).

### 6. Commit & push
Repo: `https://github.com/YogirajA/Anthropic-Cert-Prep` (PUBLIC). Before staging, confirm the secret/private
files are NOT tracked: `git ls-files --cached | grep -iE '\.env$|\.pdf$|tts/audio|playbook_pages|prep doc|settings\.local'`
must return nothing. Then commit with a descriptive message and push to `main`.

## Definition of done
`verify.mjs` is green · whole-file staleness grep is clean (only the intentional "Mythos Preview retires…" note
may remain) · all 8 tabs render in the browser with no console errors · scripts regenerated & committed · pushed.
If any of these is not true, the update is not finished.
