import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { RecordFeedback } from '../src/application/learning/record-feedback';
import { GenerateStyling } from '../src/application/styling/generate-styling';
import { parseGenerateRequest } from '../src/application/styling/parse-generate-request';
import type { GenerationRecord } from '../src/domain/learning/model';
import { defaultPreferences } from '../src/domain/styling/preferences';
import {
  AdaptiveStylingPrompt,
  buildAdaptivePrompt,
} from '../src/infrastructure/ai/adaptive-prompt';
import { buildVersionedPrompt } from '../src/infrastructure/evaluation/prompt-versions';
import { FileExperimentRepository } from '../src/infrastructure/learning/file-experiment-repository';

const context = { occasion: 'DATE', vibe: 'DANDY' } as const;

async function repository(t: { after: (fn: () => Promise<void>) => void }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'chugumi-test-'));

  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  return new FileExperimentRepository(dir);
}

function record(): GenerationRecord {
  return {
    id: randomUUID(),
    sessionId: 'owner',
    sourceHash: 'test',
    context,
    variant: 'CONTROL',
    promptVersion: 'adaptive-v2',
    preferences: defaultPreferences(),
    refinements: [],
    status: 'SUCCEEDED',
    createdAt: new Date().toISOString(),
  };
}

test('generation denominator includes no-feedback results and duplicate actions count once', async (t) => {
  const repo = await repository(t);
  const first = record();

  await repo.saveGeneration(first);
  await repo.saveGeneration(record());

  const feedback = new RecordFeedback(repo);

  await Promise.all(
    Array.from({ length: 12 }, () =>
      feedback.execute({ eventId: first.id, generationId: first.id, signal: 'LIKE' }, 'owner'),
    ),
  );
  await feedback.execute(
    { eventId: randomUUID(), generationId: first.id, signal: 'DOWNLOAD' },
    'owner',
  );

  const stats = (await repo.stats(context))[0];

  assert.equal(stats.impressions, 2);
  assert.equal(stats.feedbackCount, 1);
  assert.equal(stats.rewards, 1);
  assert.equal(stats.positivePerGeneration, 0.5);
  assert.equal(stats.rewardRate, 1);
});
test('feedback rejects unknown, failed, other-session and old regenerate signals', async (t) => {
  const repo = await repository(t);
  const first = record();
  const failed = { ...record(), status: 'FAILED' as const };

  await repo.saveGeneration(first);
  await repo.saveGeneration(failed);

  const useCase = new RecordFeedback(repo);

  for (const [id, signal, session] of [
    [first.id, 'LIKE', 'stranger'],
    [randomUUID(), 'LIKE', 'owner'],
    [failed.id, 'LIKE', 'owner'],
    [first.id, 'REGENERATE', 'owner'],
  ]) {
    await assert.rejects(
      useCase.execute({ eventId: randomUUID(), generationId: id, signal }, session),
    );
  }
});
test('explicit dissatisfaction takes precedence over download; refinements do not bias initial trials', async (t) => {
  const repo = await repository(t);
  const first = record();

  await repo.saveGeneration(first);
  await repo.saveGeneration({ ...record(), parentGenerationId: first.id });
  await repo.append({
    generationId: first.id,
    signal: 'DISLIKE',
    eventId: randomUUID(),
  });
  await repo.append({
    generationId: first.id,
    signal: 'DOWNLOAD',
    eventId: randomUUID(),
  });

  const stats = (await repo.stats(context))[0];

  assert.equal(stats.impressions, 1);
  assert.equal(stats.rewardRate, 0);
});
test('refinements retain original source and accumulate server-side, rejecting replaced photos', async (t) => {
  const repo = await repository(t);
  const prompts: string[] = [];
  const generator = new GenerateStyling(
    {
      edit: async (x) => {
        prompts.push(x.prompt);

        return { bytes: new Uint8Array([1]), contentType: 'image/png' };
      },
    },
    repo,
    { choose: () => 'CONTROL' },
    new AdaptiveStylingPrompt(),
  );
  const input = {
    image: new File(['source'], 'photo.png', { type: 'image/png' }),
    selection: context,
    preferences: defaultPreferences(),
    sessionId: 'owner',
    parentGenerationId: undefined,
    refinementReason: undefined,
  };
  const first = await generator.execute(input);
  const second = await generator.execute({
    ...input,
    parentGenerationId: first.generationId,
    refinementReason: 'LESS_FLASHY',
  });
  const third = await generator.execute({
    ...input,
    parentGenerationId: second.generationId,
    refinementReason: 'LESS_FORMAL',
  });

  assert.deepEqual((await repo.getGeneration(third.generationId))?.refinements, [
    'LESS_FLASHY',
    'LESS_FORMAL',
  ]);
  assert.match(prompts[2], /muted colors/);
  assert.match(prompts[2], /Reduce formality/);
  await assert.rejects(
    generator.execute({
      ...input,
      sessionId: 'stranger',
      parentGenerationId: first.generationId,
      refinementReason: 'LESS_FLASHY',
    }),
  );
  await assert.rejects(
    generator.execute({
      ...input,
      image: new File(['different'], 'photo.png'),
      parentGenerationId: first.generationId,
      refinementReason: 'LESS_FLASHY',
    }),
  );
});
test('provider failure persists status and timing', async (t) => {
  const repo = await repository(t);
  const generator = new GenerateStyling(
    {
      edit: async () => {
        throw new Error('provider failed');
      },
    },
    repo,
    { choose: () => 'CONTROL' },
    new AdaptiveStylingPrompt(),
  );

  await assert.rejects(
    generator.execute({
      image: new File(['source'], 'photo.png'),
      selection: context,
      preferences: defaultPreferences(),
      sessionId: 'owner',
      parentGenerationId: undefined,
      refinementReason: undefined,
    }),
  );
  assert.equal((await repo.stats(context))[0].failures, 1);
});
test('request parser validates file, preferences and paired refinement fields', () => {
  const form = new FormData();

  form.set('image', new File(['source'], 'photo.png', { type: 'image/png' }));
  form.set('occasion', 'DATE');
  form.set('vibe', 'DANDY');
  assert.deepEqual(parseGenerateRequest(form).preferences, defaultPreferences());
  form.set('preferences', '{"change":"SUBTLE","avoid":["INJECT"]}');
  assert.throws(() => parseGenerateRequest(form));
  form.delete('preferences');
  form.set('refinementReason', 'LESS_FLASHY');
  assert.throws(() => parseGenerateRequest(form));
});
test('evaluation uses exact production prompts for all variants', () => {
  for (const variant of ['CONTROL', 'PRESERVE_FIRST', 'STYLE_FIRST'] as const) {
    assert.equal(
      buildVersionedPrompt(variant, 'DATE', 'DANDY'),
      buildAdaptivePrompt(context, variant),
    );
  }
});
test('latest fit refinement replaces conflicting fit instruction', async () => {
  const { addRefinement } = await import('../src/domain/styling/preferences');

  assert.deepEqual(addRefinement(['LESS_FLASHY', 'SLIMMER_FIT'], 'RELAXED_FIT'), [
    'LESS_FLASHY',
    'RELAXED_FIT',
  ]);
  assert.deepEqual(addRefinement(['LESS_FLASHY'], 'LESS_FLASHY'), ['LESS_FLASHY']);
});
test('cold-start policy randomizes ties and validates exploration rate', async () => {
  const { EpsilonGreedyPolicy } =
    await import('../src/infrastructure/learning/epsilon-greedy-policy');

  assert.equal(new EpsilonGreedyPolicy(0, () => 0.9).choose(context, []), 'STYLE_FIRST');
  assert.throws(() => new EpsilonGreedyPolicy(Number.NaN));
  assert.throws(() => new EpsilonGreedyPolicy(2));
});
