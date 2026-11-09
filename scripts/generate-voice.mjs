// Generates Rico's voice lines with ElevenLabs into public/voice/<id>.mp3 and marks them in script.json.
// Run locally, never in CI:  ELEVENLABS_API_KEY=... node scripts/generate-voice.mjs [--voice <voiceId>] [--list]
// Uses a stock ElevenLabs library voice. Cloning or imitating a real person's voice is not allowed.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const scriptPath = resolve(root, 'public/voice/script.json');
const key = process.env.ELEVENLABS_API_KEY;
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : ''; };
if (!key) { console.error('Falta ELEVENLABS_API_KEY en el entorno.'); process.exit(1); }

if (process.argv.includes('--list')) {
  const response = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
  const { voices } = await response.json();
  for (const v of voices.filter((v) => v.labels?.gender === 'male')) console.log(`${v.voice_id}  ${v.name}  ${Object.values(v.labels || {}).join(', ')}`);
  process.exit(0);
}

const script = JSON.parse(await readFile(scriptPath, 'utf8'));
// Default: "Brian" (deep, relaxed American male stock voice), speaking Spanish through the multilingual model.
const voiceId = arg('voice') || script.voice.voiceId || 'nPczCjzI2devNBz1zQrb';
for (const line of script.lines) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text: line.text, model_id: script.voice.model || 'eleven_multilingual_v2', voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true, speed: 0.95 } }),
  });
  if (!response.ok) { console.error(`${line.id}: HTTP ${response.status} ${await response.text()}`); process.exit(1); }
  await writeFile(resolve(root, 'public/voice', `${line.id}.mp3`), Buffer.from(await response.arrayBuffer()));
  line.audio = true;
  console.log(`✔ ${line.id}.mp3`);
}
script.voice.voiceId = voiceId;
await writeFile(scriptPath, `${JSON.stringify(script, null, 2)}\n`);
console.log('Listo. Las líneas usan ahora el audio generado.');
