// Reads scripts/<bucket>.txt → audio/<bucket>.mp3 via OpenAI TTS.
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import OpenAI from "openai";

const SCRIPTS_DIR = path.resolve("scripts");
const OUT_DIR = path.resolve("audio");
fs.mkdirSync(OUT_DIR, { recursive: true });

const MODEL = process.env.TTS_MODEL || "tts-1-hd";
const VOICE = process.env.TTS_VOICE || "onyx";
const SPEED = Number(process.env.TTS_SPEED || "1.0");
const CHUNK_LIMIT = 3800; // OpenAI hard limit is 4096
const DRY_RUN = process.argv.includes("--dry-run");

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
const client = new OpenAI();

function chunk(text, limit = CHUNK_LIMIT) {
  if (text.length <= limit) return [text];
  const out = [];
  let buf = "";
  // Split on sentence-ish boundaries.
  const parts = text.split(/(?<=[.!?])\s+/);
  for (const p of parts) {
    if ((buf + " " + p).length > limit) {
      if (buf) out.push(buf);
      if (p.length > limit) {
        // Hard split a giant sentence.
        for (let i = 0; i < p.length; i += limit) out.push(p.slice(i, i + limit));
        buf = "";
      } else {
        buf = p;
      }
    } else {
      buf = buf ? buf + " " + p : p;
    }
  }
  if (buf) out.push(buf);
  return out;
}

async function synth(text, outPath) {
  const chunks = chunk(text);
  const stream = fs.createWriteStream(outPath);
  for (let i = 0; i < chunks.length; i++) {
    const res = await client.audio.speech.create({
      model: MODEL, voice: VOICE, speed: SPEED, input: chunks[i], response_format: "mp3",
    });
    const buf = Buffer.from(await res.arrayBuffer());
    stream.write(buf);
    process.stdout.write(`  chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars, ${buf.length.toLocaleString()} bytes)\n`);
  }
  await new Promise(r => stream.end(r));
}

if (DRY_RUN) {
  // 200-char sample so the user can validate voice/speed for ~$0.006.
  const firstFile = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith(".txt"))[0];
  if (!firstFile) { console.error("No scripts found. Run `npm run extract` first."); process.exit(1); }
  const text = fs.readFileSync(path.join(SCRIPTS_DIR, firstFile), "utf8").slice(0, 200);
  const out = path.join(OUT_DIR, "_sample.mp3");
  console.log(`Sample from ${firstFile}: model=${MODEL} voice=${VOICE} speed=${SPEED}`);
  await synth(text, out);
  console.log(`\nSample written to ${out}. Listen, then adjust .env if needed.`);
  process.exit(0);
}

const FORCE = process.argv.includes("--force");
const files = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith(".txt"));
if (!files.length) { console.error("No scripts found. Run `npm run extract` first."); process.exit(1); }

console.log(`Generating up to ${files.length} MP3s with model=${MODEL} voice=${VOICE} speed=${SPEED}${FORCE ? " (force)" : ""}\n`);
let made = 0, skipped = 0, missing = 0;
for (const f of files) {
  const scriptPath = path.join(SCRIPTS_DIR, f);
  const out = path.join(OUT_DIR, f.replace(/\.txt$/, ".mp3"));
  let scriptStat;
  try { scriptStat = fs.statSync(scriptPath); }
  catch { console.log(`[${f}] skipped (script vanished)`); missing++; continue; }

  if (!FORCE && fs.existsSync(out)) {
    const audioStat = fs.statSync(out);
    if (audioStat.mtimeMs >= scriptStat.mtimeMs) {
      console.log(`[${f}] up-to-date, skipping (delete ${path.basename(out)} or use --force to regenerate)`);
      skipped++;
      continue;
    }
  }

  let text;
  try { text = fs.readFileSync(scriptPath, "utf8"); }
  catch { console.log(`[${f}] skipped (script vanished mid-run)`); missing++; continue; }

  console.log(`[${f}] ${text.length.toLocaleString()} chars → ${path.basename(out)}`);
  try {
    await synth(text, out);
    const size = fs.statSync(out).size;
    console.log(`  done: ${(size / 1024 / 1024).toFixed(2)} MB\n`);
    made++;
  } catch (err) {
    console.error(`  FAILED: ${err.message}\n`);
  }
}
console.log(`All done. ${made} generated, ${skipped} up-to-date, ${missing} missing. Files in ${OUT_DIR}`);
