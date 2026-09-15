import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildVersionedPrompt, PromptVersion } from '../src/infrastructure/evaluation/prompt-versions';
import { buildJudgePrompt, weightedTotal } from '../src/infrastructure/evaluation/evaluation';
import type { Occasion, Vibe } from '../src/domain/styling/model';

const root = process.cwd();
// dotenv/config reads .env; Next.js normally uses .env.local, so load it explicitly for this CLI.
try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.join(root, '.env.local'), override: true });
} catch {}
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY is missing in .env.local');

type Case = { id: string; input: string; occasion: Occasion; vibe: Vibe };
const cases: Case[] = JSON.parse(await fs.readFile(path.join(root, 'evaluation/cases.json'), 'utf8'));
const limit = Number(process.env.EVAL_CASE_LIMIT || 1);
const versions = (process.env.EVAL_PROMPT_VERSIONS || 'P0,P1,P2,P3').split(',') as PromptVersion[];
const selected = cases.slice(0, Math.max(1, limit));
const outDir = path.join(root, 'evaluation/generated');
await fs.mkdir(outDir, { recursive: true });

function mimeFor(file: string) { return file.endsWith('.jpg') || file.endsWith('.jpeg') ? 'image/jpeg' : 'image/png'; }
function dataUrl(bytes: Buffer, mime: string) { return `data:${mime};base64,${bytes.toString('base64')}`; }

async function generate(input: Buffer, filename: string, prompt: string) {
  const form = new FormData();
  form.append('model', process.env.IMAGE_MODEL || 'gpt-image-2');
  form.append('prompt', prompt);
  form.append('size', process.env.IMAGE_SIZE || '1024x1536');
  form.append('quality', process.env.IMAGE_QUALITY || 'medium');
  form.append('image', new Blob([input], { type: mimeFor(filename) }), path.basename(filename));
  const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  if (!res.ok) throw new Error(`generation ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data: Array<{ b64_json?: string; url?: string }> };
  const item = json.data[0];
  if (item.b64_json) return Buffer.from(item.b64_json, 'base64');
  if (item.url) return Buffer.from(await (await fetch(item.url)).arrayBuffer());
  throw new Error('No generated image returned');
}

async function judge(before: Buffer, after: Buffer, occasion: string, vibe: string) {
  const schema = {
    type: 'object', additionalProperties: false,
    properties: {
      identityPreservation: { type: 'number', minimum: 0, maximum: 100 },
      bodyPreservation: { type: 'number', minimum: 0, maximum: 100 },
      posePreservation: { type: 'number', minimum: 0, maximum: 100 },
      vibeMatch: { type: 'number', minimum: 0, maximum: 100 },
      occasionMatch: { type: 'number', minimum: 0, maximum: 100 },
      outfitCoherence: { type: 'number', minimum: 0, maximum: 100 },
      realism: { type: 'number', minimum: 0, maximum: 100 },
      notes: { type: 'array', maxItems: 3, items: { type: 'string' } },
    },
    required: ['identityPreservation','bodyPreservation','posePreservation','vibeMatch','occasionMatch','outfitCoherence','realism','notes'],
  };
  const body = {
    model: process.env.EVAL_MODEL || 'gpt-5.6-luna',
    input: [{ role: 'user', content: [
      { type: 'input_text', text: buildJudgePrompt(occasion, vibe) },
      { type: 'input_text', text: 'BEFORE image:' },
      { type: 'input_image', image_url: dataUrl(before, 'image/png') },
      { type: 'input_text', text: 'AFTER image:' },
      { type: 'input_image', image_url: dataUrl(after, 'image/png') },
    ]}],
    text: { format: { type: 'json_schema', name: 'styling_evaluation', strict: true, schema } },
  };
  const res = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`judge ${res.status}: ${await res.text()}`);
  const json = await res.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = json.output_text || json.output?.flatMap(x => x.content || []).map(x => x.text || '').join('') || '';
  const score = JSON.parse(text);
  const total = weightedTotal(score);
  return { ...score, total };
}

const report: any[] = [];
for (const c of selected) {
  const relative = c.input.replace(/^\//, '').replace(/\.svg$/, '.png');
  const inputPath = path.join(root, 'public', relative);
  const before = await fs.readFile(inputPath);
  for (const version of versions) {
    console.log(`→ ${c.id} ${version}`);
    const prompt = buildVersionedPrompt(version, c.occasion, c.vibe);
    const after = await generate(before, inputPath, prompt);
    const resultPath = path.join(outDir, `${c.id}-${version}.png`);
    await fs.writeFile(resultPath, after);
    const score = await judge(before, after, c.occasion, c.vibe);
    report.push({ caseId: c.id, version, occasion: c.occasion, vibe: c.vibe, result: path.relative(root, resultPath), score });
    console.log(`  total=${score.total}`);
  }
}
await fs.writeFile(path.join(root, 'evaluation/report.json'), JSON.stringify(report, null, 2));
console.log(`\nDone: evaluation/report.json (${report.length} generations)`);
