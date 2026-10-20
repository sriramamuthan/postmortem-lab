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
// re-generates (and only spends credits on) that section. Sections are joined with a short silence into one WAV.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.tts-cache');
const GAP_SECONDS = 0.9; // silence between sections

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

const chars = sections.reduce((n, s) => n + s.text.length, 0);
console.log(`${episode}: ${sections.length} sections, ${chars} characters (roughly ${chars} credits)`);

if (args.includes('--dry-run')) {
  for (const s of sections) console.log(`\n### ${s.id} · ${s.title}\n${s.text}`);
  process.exit(0);
}

mkdirSync(CACHE, { recursive: true });
const voice = env('ELEVENLABS_VOICE_ID') ?? fail('Set ELEVENLABS_VOICE_ID in video/.env (find it with --voices)');
const wavs = [];

// Work out what this run will actually send, then check the limits before spending anything.
const jobs = sections.map((s, i) => {
  const body = {
    text: s.text,
    model_id: model,
    voice_settings: VOICE_SETTINGS,
    // Neighbouring text helps the model keep the same tone and pace across separate requests.
    previous_text: sections[i - 1]?.text,
    next_text: sections[i + 1]?.text,
  };
  const key = createHash('sha256').update(JSON.stringify({ voice, format, body })).digest('hex').slice(0, 16);
  const mp3 = join(CACHE, `${episode}-${s.id}-${key}.mp3`);
  const generate = only ? only === s.id : !existsSync(mp3);
  if (only && only !== s.id && !existsSync(mp3)) fail(`Section ${s.id} has never been generated; run without --only first`);
  return { s, body, mp3, generate };
});
const cost = jobs.filter((j) => j.generate).reduce((n, j) => n + j.s.text.length, 0);
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

for (const { s, body, mp3, generate } of jobs) {
  const wav = mp3.replace(/\.mp3$/, '.wav');
  if (generate) {
    process.stdout.write(`  ${s.id} ${s.title}: generating… `);
    const audio = await api(`/v1/text-to-speech/${voice}?output_format=${format}`, body);
    writeFileSync(mp3, Buffer.from(audio));
    // Record spend as soon as it happens, so an interrupted run still counts.
    ledger[period.key] = (ledger[period.key] ?? 0) + s.text.length;
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
    console.log('done');
  } else {
    console.log(`  ${s.id} ${s.title}: cached`);
  }
  if (!existsSync(wav) || generate) execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@44100', '-c', '1', mp3, wav]);
  wavs.push(wav);
}

const out = join(ROOT, 'public', 'audio', `${episode}.wav`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, joinWavs(wavs, GAP_SECONDS));
console.log(`\nWrote ${out}\nNext: python3 scripts/cues.py ${join('public', 'audio', `${episode}.wav`)}`);

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
  return body ? res.arrayBuffer() : res.json();
}

/** Join 16-bit PCM WAVs (same format) with silence in between. Reads chunks properly: afconvert adds a FLLR chunk. */
function joinWavs(files, gap) {
  let fmt;
  const parts = [];
  for (const [i, f] of files.entries()) {
    const buf = readFileSync(f);
    for (let p = 12; p < buf.length - 8; ) {
      const id = buf.toString('ascii', p, p + 4);
      const size = buf.readUInt32LE(p + 4);
      if (id === 'fmt ') fmt ??= buf.subarray(p + 8, p + 8 + size);
      if (id === 'data') parts.push(buf.subarray(p + 8, p + 8 + size));
      p += 8 + size + (size % 2);
    }
    if (i < files.length - 1) {
      const rate = fmt.readUInt32LE(4);
      const blockAlign = fmt.readUInt16LE(12);
      parts.push(Buffer.alloc(Math.round(rate * gap) * blockAlign));
    }
  }
  const data = Buffer.concat(parts);
  const header = Buffer.alloc(20);
  header.write('RIFF', 0);
  header.writeUInt32LE(4 + 8 + fmt.length + 8 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(fmt.length, 16);
  const dataHeader = Buffer.alloc(8);
  dataHeader.write('data', 0);
  dataHeader.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, fmt, dataHeader, data]);
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
