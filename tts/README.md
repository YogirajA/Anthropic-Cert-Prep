# Study Guide → MP3

Generates per-domain audio from `../claude-architect-study-guide 2.html` for offline review.

## Setup
```
cd tts
npm install
cp .env.example .env    # then paste your OpenAI key into .env
```

## Use
```
npm run extract     # parses HTML → scripts/<domain>.txt  (review these!)
npm run sample      # 1 tiny TTS call → audio/_sample.mp3 (check voice/speed)
npm run generate    # full run → audio/<domain>.mp3 (~$1.50 total)
```

## Output
`audio/d1-agentic.mp3`, `d2-tools-mcp.mp3`, `d3-claude-code.mp3`,
`d4-prompts.mp3`, `d5-context.mp3`, `playbook.mp3`, `ref2026.mp3`,
`exam-overview.mp3`.

## On your phone
Drop the `audio/` folder into OneDrive/Google Drive/Dropbox and open
on the phone — VLC mobile plays them with variable speed and remembers
your position.

## Tune
Override via `.env`: `TTS_MODEL` (`tts-1` is half the cost, still clear),
`TTS_VOICE` (`onyx` `nova` `alloy` `echo` `fable` `shimmer`), `TTS_SPEED`
(`1.0`–`1.25` for review).
