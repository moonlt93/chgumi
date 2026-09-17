import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { EvaluateGeneration } from '../src/application/evaluation/evaluate-generation';
import { RecordFeedback } from '../src/application/learning/record-feedback';
import { ListReviews } from '../src/application/review/list-reviews';
import { GenerateStyling } from '../src/application/styling/generate-styling';
import type { GenerationEvaluatorPort } from '../src/domain/evaluation/model';
import type { GenerationRecord } from '../src/domain/learning/model';
import { generationReward } from '../src/domain/learning/reward';
import { defaultPreferences } from '../src/domain/styling/preferences';
import { AdaptiveStylingPrompt } from '../src/infrastructure/ai/adaptive-prompt';
import { OpenAIStylingEvaluator } from '../src/infrastructure/evaluation/openai-styling-evaluator';
import {
  buildStylingJudgePrompt,
  parseStylingFindings,
} from '../src/infrastructure/evaluation/styling-judge';
import { FileExperimentRepository } from '../src/infrastructure/learning/file-experiment-repository';
import { canReview } from '../src/infrastructure/review/authorize-review';
import { useStylingStore } from '../src/presentation/styling/styling-store';

const context = { occasion: 'DATE', vibe: 'DANDY' } as const;
const image = { bytes: new Uint8Array([1]), contentType: 'image/png' };
const findings = {
  identity: { verdict: 'pass', reason: '얼굴이 유지됨' },
  body: { verdict: 'uncertain', reason: '몸이 가려짐' },
  constraints: { verdict: 'pass', reason: '요청을 반영함' },
  styling: { verdict: 'pass', reason: '단정한 코디' },
};

function record(): GenerationRecord {
  return {
    id: randomUUID(),
    sessionId: 'owner',
    sourceHash: 'private-hash',
    context,
    variant: 'CONTROL',
    promptVersion: 'adaptive-v2',
    preferences: defaultPreferences(),
    refinements: [],
    status: 'SUCCEEDED',
    createdAt: new Date().toISOString(),
  };
}

async function setup(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'chugumi-loop-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new FileExperimentRepository(directory);
  const generation = record();
  await repository.saveGeneration(generation);
  return { directory, repository, generation, feedback: new RecordFeedback(repository) };
}

test('opinions can change back; replay of an earlier event cannot overwrite the latest opinion', async (t) => {
  const { repository, generation, feedback } = await setup(t);
  const first = { eventId: randomUUID(), generationId: generation.id, signal: 'LIKE' };
  await feedback.execute(first, 'owner');
  await feedback.execute(
    { eventId: randomUUID(), generationId: generation.id, signal: 'DISLIKE', reason: 'TOO_FORMAL' },
    'owner',
  );
  const final = await feedback.execute(
    { eventId: randomUUID(), generationId: generation.id, signal: 'LIKE' },
    'owner',
  );
  await feedback.execute(first, 'owner');
  const events = await repository.getFeedback(generation.id);
  assert.equal(events.length, 3);
  assert.equal(final.sequence, 3);
  assert.equal(generationReward(events), 1);
  await assert.rejects(feedback.execute({ ...first, signal: 'DISLIKE' }, 'owner'));
});

test('concurrent writes across repository instances retain every distinct event and deduplicate retransmissions', async (t) => {
  const { repository, directory, generation } = await setup(t);
  const other = new FileExperimentRepository(directory);
  const event = { eventId: randomUUID(), generationId: generation.id, signal: 'DOWNLOAD' as const };
  await Promise.all(
    Array.from({ length: 10 }, (_, index) => (index % 2 ? repository : other).append(event)),
  );
  await Promise.all(
    Array.from({ length: 10 }, () =>
      other.append({ ...event, eventId: randomUUID(), signal: 'LIKE' }),
    ),
  );
  const events = await repository.getFeedback(generation.id);
  assert.equal(events.length, 11);
  assert.deepEqual(
    events.map((item) => item.sequence),
    Array.from({ length: 11 }, (_, index) => index + 1),
  );
});

test('download, quality report, and pairwise preference do not become satisfaction rewards', async (t) => {
  const { repository, generation, feedback } = await setup(t);
  const child = { ...record(), parentGenerationId: generation.id };
  await repository.saveGeneration(child);
  for (const data of [
    { signal: 'DOWNLOAD' },
    { signal: 'REPORT', reason: 'IDENTITY_CHANGED' },
    { signal: 'COMPARE', comparison: 'BETTER' },
  ]) {
    await feedback.execute({ eventId: randomUUID(), generationId: child.id, ...data }, 'owner');
  }
  assert.equal(generationReward(await repository.getFeedback(child.id)), null);
  await assert.rejects(
    feedback.execute(
      {
        eventId: randomUUID(),
        generationId: generation.id,
        signal: 'COMPARE',
        comparison: 'BETTER',
      },
      'owner',
    ),
  );
  await assert.rejects(
    feedback.execute(
      { eventId: randomUUID(), generationId: child.id, signal: 'REPORT', reason: 'OTHER' },
      'owner',
    ),
  );
  await assert.rejects(feedback.read(child.id, 'stranger'));
});

test('legacy signal files are preserved when a new opinion is recorded', async (t) => {
  const { repository, directory, generation, feedback } = await setup(t);
  await fs.writeFile(
    path.join(directory, generation.id, 'DISLIKE.json'),
    JSON.stringify({ createdAt: '2026-01-01T00:00:00Z' }),
  );
  await feedback.execute(
    { eventId: randomUUID(), generationId: generation.id, signal: 'LIKE' },
    'owner',
  );
  assert.equal((await repository.getFeedback(generation.id)).length, 2);
  assert.equal(generationReward(await repository.getFeedback(generation.id)), 1);
});

test('evaluation failure does not turn a successful generation into a generation failure', async (t) => {
  const { repository } = await setup(t);
  const evaluator: GenerationEvaluatorPort = {
    model: 'test',
    version: 'test-v1',
    evaluate: async () => {
      throw new Error('provider refused');
    },
  };
  const generator = new GenerateStyling(
    { edit: async () => image },
    repository,
    { choose: () => 'CONTROL' },
    new AdaptiveStylingPrompt(),
    new EvaluateGeneration(repository, evaluator),
  );
  const result = await generator.execute({
    image: new File(['original'], 'original.png', { type: 'image/png' }),
    selection: context,
    preferences: defaultPreferences(),
    sessionId: 'owner',
    parentGenerationId: undefined,
    refinementReason: undefined,
  });
  assert.equal(result.evaluationStatus, 'FAILED');
  assert.equal((await repository.getGeneration(result.generationId))?.status, 'SUCCEEDED');
  assert.equal((await repository.getEvaluation(result.generationId))?.errorCode, 'EVALUATOR_ERROR');
  assert.deepEqual(result.image, image);
});

test('review identifies a quality disagreement and never exposes session IDs or original hashes', async (t) => {
  const { repository, generation, feedback } = await setup(t);
  await new EvaluateGeneration(repository, {
    model: 'test',
    version: 'test-v1',
    evaluate: async () => parseStylingFindings(findings),
  }).execute({ generation, original: new File(['original'], 'input.png'), result: image });
  await feedback.execute(
    {
      eventId: randomUUID(),
      generationId: generation.id,
      signal: 'REPORT',
      reason: 'IDENTITY_CHANGED',
    },
    'owner',
  );
  const reviews = await new ListReviews(repository).execute();
  assert.deepEqual(reviews.items[0].disagreements, ['identity']);
  const text = JSON.stringify(reviews);
  assert.ok(!text.includes('sessionId'));
  assert.ok(!text.includes('sourceHash'));
  assert.ok(!text.includes('private-hash'));
  assert.equal((await new ListReviews(repository).execute(1)).items.length, 0);
});

test('review access is closed unless a strong configured token matches', () => {
  const token = 'test-token-with-at-least-24-characters';
  assert.equal(canReview(null, token), false);
  assert.equal(canReview(`Bearer ${token}`, ''), false);
  assert.equal(canReview('Bearer wrong', token), false);
  assert.equal(canReview(`Bearer ${token}`, token), true);
});

test('judge validates every criterion and passes user conditions and refinements to the model', () => {
  assert.equal(parseStylingFindings(findings)[1].verdict, 'uncertain');
  assert.throws(() =>
    parseStylingFindings({ ...findings, identity: { verdict: 'great', reason: 'ok' } }),
  );
  assert.throws(() => parseStylingFindings({ identity: findings.identity }));
  const prompt = buildStylingJudgePrompt({
    original: new File(['photo'], 'photo.png'),
    result: image,
    generation: {
      ...record(),
      preferences: { change: 'BOLD', avoid: ['ACCESSORIES'] },
      refinements: ['LESS_FORMAL'],
    },
  });
  assert.match(prompt, /ACCESSORIES/);
  assert.match(prompt, /LESS_FORMAL/);
});

test('production evaluator sends a structured, non-stored request with original and result images', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    calls += 1;
    const body = JSON.parse(String(init.body));
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(
      body.input[0].content.filter((item: { type: string }) => item.type === 'input_image').length,
      2,
    );
    return new Response(
      JSON.stringify({
        id: 'test',
        status: 'completed',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: JSON.stringify(findings), annotations: [] }],
          },
        ],
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  });
  const evaluator = new OpenAIStylingEvaluator({ apiKey: 'test-only-placeholder', model: 'test' });
  const result = await evaluator.evaluate({
    original: new File(['source'], 'source.png', { type: 'image/png' }),
    result: image,
    generation: record(),
  });
  assert.equal(calls, 1);
  assert.equal(result.length, 4);
});

test('result state retains only the immediate parent, survives failed refinements, and releases old URLs', (t) => {
  const store = useStylingStore;
  store.getState().reset();
  t.after(() => store.getState().reset());
  const revoke = t.mock.method(URL, 'revokeObjectURL', () => undefined);
  store.getState().setImage(new File(['source'], 'source.png'));
  store.getState().setResult(new Blob(['first']), 'first', 'CONTROL');
  const firstUrl = store.getState().resultUrl;
  store.getState().refine('LESS_FORMAL');
  store.getState().setError('temporary failure');
  assert.equal(store.getState().resultUrl, firstUrl);
  store.getState().setResult(new Blob(['second']), 'second', 'CONTROL');
  assert.equal(store.getState().previousResultUrl, firstUrl);
  assert.equal(store.getState().previousGenerationId, 'first');
  const secondUrl = store.getState().resultUrl;
  store.getState().refine('LESS_FLASHY');
  store.getState().setResult(new Blob(['third']), 'third', 'CONTROL');
  assert.equal(store.getState().previousResultUrl, secondUrl);
  assert.ok(revoke.mock.calls.some((call) => call.arguments[0] === firstUrl));
  store.getState().clearResult();
  assert.equal(store.getState().previousResultUrl, null);
});
