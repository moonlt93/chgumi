import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';

import type { GenerationRecord } from '../src/domain/learning/model';
import { PROMPT_VARIANTS } from '../src/domain/learning/model';
import { isOccasion, isVibe } from '../src/domain/styling/model';
import { defaultPreferences } from '../src/domain/styling/preferences';
import { OpenAIImageGenerator } from '../src/infrastructure/ai/openai-image-generator';
import { OpenAIStylingEvaluator } from '../src/infrastructure/evaluation/openai-styling-evaluator';
import {
  buildVersionedPrompt,
  type PromptVersion,
} from '../src/infrastructure/evaluation/prompt-versions';

const root = process.cwd();
const environment = dotenv.config({ path: path.join(root, '.env.local'), override: true });

if (environment.error && (environment.error as NodeJS.ErrnoException).code !== 'ENOENT') {
  throw environment.error;
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is missing');
}

const limit = Number(process.env.EVAL_CASE_LIMIT || 1);
const versions = (process.env.EVAL_PROMPT_VERSIONS || PROMPT_VARIANTS.join(',')).split(',');
const allowedVersions = [...PROMPT_VARIANTS, 'P0', 'P1', 'P2', 'P3'];

if (
  !Number.isSafeInteger(limit) ||
  limit < 1 ||
  !versions.every((version) => allowedVersions.includes(version))
) {
  throw new Error('Invalid EVAL_CASE_LIMIT or EVAL_PROMPT_VERSIONS');
}

const rawCases: unknown = JSON.parse(
  await fs.readFile(path.join(root, 'evaluation/cases.json'), 'utf8'),
);

if (!Array.isArray(rawCases)) {
  throw new Error('Evaluation cases must be an array');
}

const cases = rawCases.map((value: unknown) => {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid evaluation case');
  }
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== 'string' ||
    !/^[a-z0-9-]+$/i.test(item.id) ||
    typeof item.input !== 'string' ||
    !isOccasion(item.occasion) ||
    !isVibe(item.vibe)
  ) {
    throw new Error('Invalid evaluation case');
  }
  return { id: item.id, input: item.input, occasion: item.occasion, vibe: item.vibe };
});
const outputDirectory = path.join(root, 'evaluation/generated');
const generator = new OpenAIImageGenerator();
const evaluator = new OpenAIStylingEvaluator();
const report = [];

await fs.mkdir(outputDirectory, { recursive: true });

for (const evaluationCase of cases.slice(0, limit)) {
  const inputPath = path.resolve(
    root,
    'public',
    evaluationCase.input.replace(/^\//, '').replace(/\.svg$/, '.png'),
  );
  if (!inputPath.startsWith(path.resolve(root, 'public') + path.sep)) {
    throw new Error('Evaluation input must be inside public');
  }
  const bytes = await fs.readFile(inputPath);
  const mimeType = /\.jpe?g$/i.test(inputPath) ? 'image/jpeg' : 'image/png';
  const original = new File([new Uint8Array(bytes)], path.basename(inputPath), { type: mimeType });
  for (const version of versions) {
    console.log(`${evaluationCase.id} ${version}`);
    const result = await generator.edit({
      image: original,
      filename: original.name,
      prompt: buildVersionedPrompt(
        version as PromptVersion,
        evaluationCase.occasion,
        evaluationCase.vibe,
      ),
    });
    const generation: GenerationRecord = {
      id: randomUUID(),
      sessionId: 'offline',
      sourceHash: 'offline',
      context: { occasion: evaluationCase.occasion, vibe: evaluationCase.vibe },
      variant: PROMPT_VARIANTS.includes(version as never)
        ? (version as GenerationRecord['variant'])
        : 'CONTROL',
      promptVersion: version,
      preferences: defaultPreferences(),
      refinements: [],
      status: 'SUCCEEDED',
      createdAt: new Date().toISOString(),
    };
    const findings = await evaluator.evaluate({ original, result, generation });
    const resultPath = path.join(outputDirectory, `${evaluationCase.id}-${version}.png`);
    await fs.writeFile(resultPath, result.bytes);
    report.push({
      caseId: evaluationCase.id,
      version,
      evaluatorVersion: evaluator.version,
      model: evaluator.model,
      findings,
      result: path.relative(root, resultPath),
    });
    await fs.writeFile(path.join(root, 'evaluation/report.json'), JSON.stringify(report, null, 2));
  }
}

console.log(`Saved evaluation/report.json (${report.length} results)`);
