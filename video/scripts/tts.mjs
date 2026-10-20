// Turn a TTS script (docs/scripts/ep-NN-tts.md) into narration with the ElevenLabs API.
//
//   node scripts/tts.mjs ../docs/scripts/ep-01-tts.md            -> public/audio/ep-01.wav
//   node scripts/tts.mjs ../docs/scripts/ep-01-tts.md --dry-run  -> show sections and character count, no API calls
//   node scripts/tts.mjs --voices                                 -> list voices on the account (to find VOICE_ID)
//   node scripts/tts.mjs <script> --only 04                       -> regenerate just section 04
//
// Settings come from video/.env (never committed): ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, and optionally
// ELEVENLABS_MODEL (default eleven_multilingual_v2) and ELEVENLABS_FORMAT (default mp3_44100_128).
//
// Spending limits (credits = characters on multilingual v2), checked before any request is made:
//   TTS_MAX_PER_RUN     default 12000  (one ~10 minute episode plus margin)
//   TTS_MAX_PER_PERIOD  default 25000  (per credit refresh period; tracked in .tts-cache/ledger.json)
// A run that would cross either limit stops without generating anything.
//
// Each "### NN · Title" section is one request. Results are cached by text and settings, so editing one section only
// re-generates (and only spends credits on) that section. Pauses come from the script's <break> tags, inserted as
// exact silence after generation (the tags themselves are never sent).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function round(x) {
  return Math.round(x * 1000) / 1000;
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.tts-cache');

// Delivery tuned on EP-00. Keep these stable so episodes sound alike.
const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.78, style: 0.1, use_speaker_boost: true, speed: 0.95 };

loadEnv(join(ROOT, '.env'));
const args = process.argv.slice(2);
const env = (name, fallback) => process.env[name] || fallback;

if (args.includes('--voices')) {
  const res = await api('/v1/voices');
  for (const v of res.voices) console.log(`${v.voice_id}  ${v.name}  (${v.category})`);
  process.exit(0);
}

const scriptPath = args.find((a) => !a.startsWith('--'));
if (!scriptPath) fail('Usage: node scripts/tts.mjs <docs/scripts/ep-NN-tts.md> [--dry-run] [--only NN]');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const sections = parseScript(readFileSync(scriptPath, 'utf8'));
const episode = basename(scriptPath).replace(/-tts\.md$/, '').replace(/\.md$/, '');
const model = env('ELEVENLABS_MODEL', 'eleven_multilingual_v2');
const format = env('ELEVENLABS_FORMAT', 'mp3_44100_128');

const chars = sections.reduce((n, s) => n + spokenText(s.text).length, 0);
console.log(`${episode}: ${sections.length} sections, ${chars} characters (roughly ${chars} credits)`);

if (args.includes('--dry-run')) {
  for (const s of sections) console.log(`\n### ${s.id} · ${s.title}\n${s.text}`);
  // Estimated cues (about 15 characters a second plus the pauses), so scenes can be previewed before spending credits.
  const est = [];
  let t = 0;
  for (const s of sections) {
    const parts = s.text.split(/(<break time="[\d.]+s" \/>)/);
    let line = 0;
    for (const part of parts) {
      const pause = /<break time="([\d.]+)s"/.exec(part);
      if (pause) t += Number(pause[1]);
      else if (part.trim()) {
        const d = part.trim().length / 15;
        est.push({ section: s.id, line: line++, text: part.trim(), start: round(t), end: round(t + d), estimated: true });
        t += d;
      }
    }
  }
  const cuesOut = join(ROOT, 'public', 'audio', `${episode}.cues.json`);
  if (!existsSync(join(ROOT, 'public', 'audio', `${episode}.wav`))) {
    mkdirSync(dirname(cuesOut), { recursive: true });
    writeFileSync(cuesOut, JSON.stringify(est, null, 2));
    console.log(`\nWrote estimated cues to ${cuesOut} (no audio yet)`);
  }
  process.exit(0);
}

mkdirSync(CACHE, { recursive: true });
const voice = env('ELEVENLABS_VOICE_ID') ?? fail('Set ELEVENLABS_VOICE_ID in video/.env (find it with --voices)');

// Work out what this run will actually send, then check the limits before spending anything.
// <break> tags are NOT sent: many of them in one request make the model fill pauses with noise. Instead the lines are
// sent as plain sentences, and the exact pauses are inserted afterwards using the character timings.
const jobs = sections.map((s, i) => {
  const body = {
    text: spokenText(s.text),
    model_id: model,
    voice_settings: VOICE_SETTINGS,
    // Neighbouring text helps the model keep the same tone and pace across separate requests.
    previous_text: sections[i - 1] && spokenText(sections[i - 1].text),
    next_text: sections[i + 1] && spokenText(sections[i + 1].text),
  };
  // Keyed on this section's own text and settings only, so editing a neighbour doesn't re-generate (and re-bill) it.
  const { previous_text, next_text, ...own } = body;
  const key = createHash('sha256').update(JSON.stringify({ voice, format, own })).digest('hex').slice(0, 16);
  const oldKey = createHash('sha256').update(JSON.stringify({ voice, format, body })).digest('hex').slice(0, 16);
  migrate(join(CACHE, `${episode}-${s.id}-${oldKey}`), join(CACHE, `${episode}-${s.id}-${key}`));
  const mp3 = join(CACHE, `${episode}-${s.id}-${key}.mp3`);
  const generate = only ? only === s.id : !existsSync(mp3);
  if (only && only !== s.id && !existsSync(mp3)) fail(`Section ${s.id} has never been generated; run without --only first`);
  return { s, body, mp3, generate };
});
const cost = jobs.filter((j) => j.generate).reduce((n, j) => n + j.body.text.length, 0);
const maxRun = Number(env('TTS_MAX_PER_RUN', 12000));
const maxPeriod = Number(env('TTS_MAX_PER_PERIOD', 25000));
const period = await currentPeriod();
const ledgerPath = join(CACHE, 'ledger.json');
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : {};
const used = ledger[period.key] ?? 0;

console.log(`This run: ${cost} credits · used this period: ${used} of ${maxPeriod} · per-run limit ${maxRun}`);
if (period.remaining !== undefined) console.log(`ElevenLabs account: ${period.remaining} credits left until ${period.key}`);
if (cost > maxRun) fail(`Stopped: ${cost} credits is over the per-run limit (${maxRun}). Use --only, or raise TTS_MAX_PER_RUN.`);
if (used + cost > maxPeriod) fail(`Stopped: would reach ${used + cost} credits this period (limit ${maxPeriod}).`);
if (period.remaining !== undefined && cost > period.remaining) fail('Stopped: not enough credits left on the account.');

const pieces = [];
const cues = [];
let clock = 0;
for (const { s, body, mp3, generate } of jobs) {
  const wav = mp3.replace(/\.mp3$/, '.wav');
  const alignmentFile = mp3.replace(/\.mp3$/, '.json');
  if (generate) {
    process.stdout.write(`  ${s.id} ${s.title}: generating… `);
    // The with-timestamps endpoint costs the same and returns per-character timing.
    const res = await api(`/v1/text-to-speech/${voice}/with-timestamps?output_format=${format}`, body);
    writeFileSync(mp3, Buffer.from(res.audio_base64, 'base64'));
    writeFileSync(alignmentFile, JSON.stringify(res.alignment ?? null));
    // Record spend as soon as it happens, so an interrupted run still counts.
    ledger[period.key] = (ledger[period.key] ?? 0) + body.text.length;
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
    console.log('done');
  } else {
    console.log(`  ${s.id} ${s.title}: cached`);
  }
  if (!existsSync(wav) || generate) execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@44100', '-c', '1', mp3, wav]);

  // Cut each line out of the section audio and lay it down with exactly the pause the script asks for.
  const { samples, rate } = readWav(wav);
  const alignment = JSON.parse(readFileSync(alignmentFile, 'utf8'));
  const lines = scriptLines(s.text);
  const times = lineTimes(lines, alignment);
  for (const [i, line] of lines.entries()) {
    const { start, end } = times[i];
    const prevEnd = i > 0 ? times[i - 1].end : 0;
    const nextStart = i < lines.length - 1 ? times[i + 1].start : samples.length / rate;
    // Extend outwards from the words until the audio is actually quiet (soft consonants and word endings sit outside
    // the aligned times), but never past halfway to the neighbouring line.
    const from = quietEdge(samples, rate, start - 0.02, -1, (prevEnd + start) / 2);
    const to = quietEdge(samples, rate, end + 0.02, +1, (end + nextStart) / 2);
    const piece = fadeEdges(samples.slice(Math.round(from * rate), Math.round(to * rate)), rate);
    cues.push({ section: s.id, line: i, text: line.text, start: round(clock + (start - from)), end: round(clock + (end - from)) });
    pieces.push(piece);
    clock += piece.length / rate;
    const pause = line.pause || (i === lines.length - 1 ? 1.0 : 0.15);
    pieces.push(new Int16Array(Math.round(pause * rate)));
    clock += pause;
  }
}

const out = join(ROOT, 'public', 'audio', `${episode}.wav`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, writeWav(concat(pieces), 44100));
writeFileSync(out.replace(/\.wav$/, '.cues.json'), JSON.stringify(cues, null, 2));
console.log(`\nWrote ${out} (${clock.toFixed(1)} s)\nCues: ${episode}.cues.json (line timings for the video)`);

// --- helpers ---

/**
 * The current credit period. Uses the account's reset date when the key may read it (user_read permission),
 * otherwise the calendar month.
 */
async function currentPeriod() {
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': env('ELEVENLABS_API_KEY') ?? '' },
    });
    if (res.ok) {
      const sub = await res.json();
      return {
        key: new Date(sub.next_character_count_reset_unix * 1000).toISOString().slice(0, 10),
        remaining: sub.character_limit - sub.character_count,
      };
    }
  } catch {
    // Offline or no permission: fall back to the calendar month.
  }
  return { key: new Date().toISOString().slice(0, 7) };
}

/** Lines of a section with the pause (seconds) the script puts after each one. */
function scriptLines(text) {
  const out = [];
  for (const part of text.split(/(<break time="[\d.]+s" \/>)/)) {
    const pause = /<break time="([\d.]+)s"/.exec(part);
    if (pause && out.length) out.at(-1).pause = Number(pause[1]);
    else if (part.trim()) out.push({ text: part.trim(), pause: 0 });
  }
  return out;
}

/** What is sent to the API: the lines as plain sentences, no tags. */
function spokenText(text) {
  return scriptLines(text).map((l) => l.text).join(' ');
}

/** Start and end time of every line, from the per-character alignment of spokenText(). */
function lineTimes(lines, alignment) {
  const { character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
  let at = 0;
  return lines.map((l) => {
    const first = at;
    const last = at + l.text.length - 1;
    at += l.text.length + 1; // the joining space
    return { start: starts[first], end: ends[Math.min(last, ends.length - 1)] };
  });
}

/** One-time move of cache files from the old key (which included neighbouring text) to the new one. */
function migrate(from, to) {
  for (const ext of ['.mp3', '.json', '.wav']) {
    if (existsSync(from + ext) && !existsSync(to + ext)) renameSync(from + ext, to + ext);
  }
}

/** Walk from time t in direction dir until 20 ms in a row are below -45 dBFS, or until the limit. */
function quietEdge(samples, rate, t, dir, limit) {
  const win = Math.round(rate * 0.02);
  const quiet = 32768 * 10 ** (-45 / 20);
  let i = Math.round(t * rate);
  const stop = Math.round(limit * rate);
  while (dir < 0 ? i - win > stop : i + win < stop) {
    const a = dir < 0 ? i - win : i;
    let sum = 0;
    for (let k = a; k < a + win; k++) sum += samples[k] * samples[k];
    if (Math.sqrt(sum / win) < quiet) return (dir < 0 ? a : a + win) / rate;
    i += dir * Math.round(rate * 0.005);
  }
  return stop / rate;
}

/** 25 ms fades: cuts never click, and a breath cut in half fades instead of stopping dead. */
function fadeEdges(samples, rate) {
  const n = Math.min(Math.round(rate * 0.025), samples.length >> 1);
  for (let i = 0; i < n; i++) {
    samples[i] = Math.round((samples[i] * i) / n);
    samples[samples.length - 1 - i] = Math.round((samples[samples.length - 1 - i] * i) / n);
  }
  return samples;
}

function readWav(file) {
  const buf = readFileSync(file);
  let rate = 44100;
  for (let p = 12; p < buf.length - 8; ) {
    const id = buf.toString('ascii', p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') rate = buf.readUInt32LE(p + 12);
    if (id === 'data') {
      const data = buf.subarray(p + 8, p + 8 + size);
      const samples = new Int16Array(data.length >> 1);
      for (let i = 0; i < samples.length; i++) samples[i] = data.readInt16LE(i * 2);
      return { samples, rate };
    }
    p += 8 + size + (size % 2);
  }
  fail(`No audio data in ${file}`);
}

function concat(parts) {
  const out = new Int16Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** 16-bit mono PCM WAV. */
function writeWav(samples, rate) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + samples.length * 2, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(samples.length * 2, 40);
  return Buffer.concat([header, Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength)]);
}


/** Sections are "### NN · Title" headings; everything up to the next heading is spoken text. */
function parseScript(md) {
  const out = [];
  for (const block of md.split(/^### /m).slice(1)) {
    const [heading, ...lines] = block.split('\n');
    const [id, ...rest] = heading.split('·').map((x) => x.trim());
    const text = lines.join('\n').replace(/^---\s*$/gm, '').replace(/\s+/g, ' ').trim();
    if (text) out.push({ id, title: rest.join(' · '), text });
  }
  if (!out.length) fail('No "### NN · Title" sections found in the script');
  return out;
}

async function api(path, body) {
  const key = env('ELEVENLABS_API_KEY') ?? fail('Set ELEVENLABS_API_KEY in video/.env');
  const res = await fetch(`https://api.elevenlabs.io${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) fail(`ElevenLabs ${res.status}: ${await res.text()}`);
  return res.json();
}


function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
