# CLAUDE.md — Certification Prep (CCA‑F study kit)

## ⚠️ Golden rule: accuracy throughout, ZERO gaps
This is an exam study guide. **It is only useful if it is accurate everywhere.** When the user says "update" (or requests any change), updating one tab or the obvious spots is a FAILURE. Required every time:

- **Every tab must be brought up to date** — Flashcards, Practice Exam, Q&A Review, Quick Review, Cheat Sheet, Scripts, CC Reference, Commands. No tab may be left stale or contradictory.
- **Verify accuracy throughout** against authoritative Anthropic docs (`code.claude.com/docs`, `platform.claude.com/docs`, `modelcontextprotocol.io`). Do NOT trust memory for model IDs, beta headers, limits, or model‑support lists.
- **No internal contradictions** — the same fact must read consistently across all tabs and all underlying data arrays.
- **Hunt for hallucinations** before declaring done: invented flags/headers/fields, wrong model‑support lists, stale "newest model" framing, numbers that disagree between tabs.

## Where the content lives (all in `claude-architect-study-guide 2.html`)
JS data arrays near the bottom:
- `allCards` → **Flashcards**
- `examQs` → **Practice Exam**
- `qaBankExtra` (~250 items) → the bulk of **Q&A Review** (`qaBank = examQs.concat(qaBankExtra)`)
- `crashRows` → **Quick Review**

Static HTML sections: `#sheet` (**Cheat Sheet**), `#ccref` (**CC Reference** + the "Absolute Numbers" tables), `#commands` (**Commands**).

**A single fact usually appears in ALL of these. Changing it in one place is not enough — grep the whole file and fix every occurrence.**

## After ANY content change (do all four)
1. Grep the whole file for the old/stale value → confirm zero stragglers, in every array and every tab.
2. Validate the JS parses (`node` `new Function()` over each `<script>` block).
3. Regenerate the TTS scripts: `cd tts && npm run extract` (they derive from `#sheet` + `crashRows` + `qaBankExtra` — their answers/numbers MUST match the Q&A bank). **`tts/scripts/*.txt` are tracked in git — commit them after regenerating.** `tts/audio/` stays git-ignored.
4. Final no‑gaps verification grep before reporting done.

## Scope note
The exam is model‑version‑agnostic (it tests architectural judgment, not which model is newest), but the guide must STILL be factually current — stale model names/lists destroy trust. Keep model content accurate AND labelled where apt (e.g. "context only / not exam‑tested").

## Repo skills
- **`/update-course`** (`.claude/skills/update-course/`) — make the changes: research vs docs, edit ALL content
  stores with zero gaps, regenerate+commit scripts, verify, push. Bundles `scripts/verify.mjs` (structural health check).
- **`/qa-course`** (`.claude/skills/qa-course/`) — read-only audit: cross-check every claim against official docs,
  hunt hallucinations, check answer-key correctness + cross-tab contradictions, report findings (does NOT edit).
  Bundles `scripts/extract-claims.mjs` (turns the guide into a finite checklist of doc-checkable claims).
- Typical loop: `/qa-course` to find problems → `/update-course` to fix them.

## Git
Repo: https://github.com/YogirajA/Anthropic-Cert-Prep (PUBLIC). Never commit `tts/.env` (secret), the copyrighted PDFs, page images, or `prep doc.txt` (named individuals) — see `.gitignore`.
