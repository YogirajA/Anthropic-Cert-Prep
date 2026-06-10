# Anthropic Cert Prep — Claude Certified Architect, Foundations (CCA‑F)

A self-contained study kit for the **Claude Certified Architect – Foundations** exam, refreshed for the **Claude Opus 4.8 / Fable 5 era (June 2026)**.

> ⚠️ **Unofficial.** This is personal study material, not affiliated with or endorsed by Anthropic. Facts are cross-checked against `code.claude.com/docs` and `platform.claude.com/docs`, but always verify against the official docs.

## What's here

- **`claude-architect-study-guide 2.html`** — the main artifact. Open it in any browser; everything is offline in one file. Tabs:
  - **Flashcards** (111+) · **Practice Exam** (35 Qs, 720-to-pass scoring) · **Q&A Review** (280+ searchable) · **Quick Review** crash sheet · **Cheat Sheet** (5 domains + 2026 reference) · **Scripts** (audio follow-along) · **CC Reference** · **⚡ Commands** (advanced Claude Code commands like `/loop` and `/goal` — enrichment, not exam-tested).
- **`tts/`** — generates per-domain MP3s from the study guide for offline listening.

## TTS pipeline

```bash
cd tts
npm install
cp .env.example .env      # add your OpenAI API key
npm run extract           # HTML → scripts/*.txt  (free; parses the guide)
npm run generate          # scripts → audio/*.mp3  (paid; ~$4 of OpenAI TTS)
```

`scripts/` and `audio/` are git-ignored (regenerable). Re-run `npm run extract` after editing the guide.

## A note on scope

The exam is **model-version agnostic** — it tests architectural judgment (the agentic loop, MCP/SDK mechanics, prompting, context management, anti-patterns), **not** which model is newest or pricing. The model lineup and advanced-command content here is context, not memorization fodder. Domain weights: D1 Agentic 27% · D2 Tools/MCP 18% · D3 Claude Code 20% · D4 Prompts 20% · D5 Context 15%.

## Not included in this repo

The official Anthropic study PDFs and extracted page images (copyrighted) and private meeting notes are intentionally git-ignored. See `.gitignore`.

---
*Last refreshed: June 2026.*
