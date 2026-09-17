import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ManageLife, today } from '../src/application/life/manage-life';
import { coachContext, RecommendLife } from '../src/application/life/recommend-life';
import type { CoachContext, CoachPort, CoachResult } from '../src/domain/life/coach';
import { initialState } from '../src/domain/life/model';
import { coachInstructions } from '../src/infrastructure/life/coach-prompt';
import { FileLifeRepository } from '../src/infrastructure/life/file-life-repository';
import { OpenAILifeCoach, parseCoachReply } from '../src/infrastructure/life/openai-life-coach';

const reply = {
  encouragement: '작게 시작해도 괜찮아요.',
  suggestions: [
    {
      category: 'outfit',
      title: '가진 옷의 차분한 색 조합 찾기',
      description: '옷장에서 편한 옷 두 가지를 꺼내 보세요.',
      reason: '단정한 일상을 원한다는 목표에 맞췄어요.',
      minutes: 5,
    },
    {
      category: 'activity',
      title: '5분 동안 가볍게 걷기',
      description: '편한 속도로 잠깐 걸어보세요.',
      reason: '지난 산책이 어려웠다는 기록에 맞춰 시간을 줄였어요.',
      minutes: 5,
    },
  ],
};
const result = (): CoachResult => ({
  ...parseCoachReply(reply),
  source: 'ai',
  model: 'test-model',
  toolsUsed: ['get_persona', 'get_recent_records'],
  createdAt: new Date().toISOString(),
});
const context: CoachContext = {
  persona: { name: '단정한 일상', description: '차분한 일상', aspiration: '나에게 맞는 속도' },
  records: [
    {
      day: today(),
      category: 'activity',
      title: '산책',
      note: '15분이 부담됐어요',
      feeling: '어려웠어요',
    },
  ],
  rewards: { day: today(), completedCategories: [] },
};
function tool(name: string, id: string, args = '{}') {
  return {
    type: 'function_call',
    name,
    call_id: id,
    arguments: args,
    id: `fc_${id}`,
    status: 'completed',
  };
}
function response(output: unknown[]) {
  return new Response(JSON.stringify({ id: randomUUID(), status: 'completed', output }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
function answer(value: unknown = reply) {
  return response([
    {
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text: JSON.stringify(value), annotations: [] }],
    },
  ]);
}

test('ReAct sends tool observations back to the model and returns only validated suggestions and tool names', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    calls += 1;
    const body = JSON.parse(String(init.body));
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.tools.length, 3);
    if (calls === 1) {
      assert.equal(body.tool_choice, 'required');
      return response([tool('get_persona', 'persona')]);
    }
    if (calls === 2) {
      const observation = body.input.find(
        (item: { type: string }) => item.type === 'function_call_output',
      );
      assert.equal(observation.call_id, 'persona');
      assert.deepEqual(JSON.parse(observation.output), context.persona);
      return response([tool('get_recent_records', 'records')]);
    }
    const observations = body.input.filter(
      (item: { type: string }) => item.type === 'function_call_output',
    );
    assert.deepEqual(JSON.parse(observations[1].output), {
      records: context.records,
      previousSuggestions: [],
    });
    return answer();
  });
  const output = await new OpenAILifeCoach({ apiKey: 'test-only', model: 'test-model' }).generate(
    context,
  );
  assert.equal(calls, 3);
  assert.equal(output.suggestions[1].minutes, 5);
  assert.deepEqual(output.toolsUsed, ['get_persona', 'get_recent_records']);
  assert.equal('input' in output, false);
  assert.equal('reasoning' in output, false);
});

test('ReAct refuses missing required observations, unknown tools, and supplied user IDs', async (t) => {
  const candidates = [
    answer(),
    response([tool('give_coins', 'bad')]),
    response([tool('get_persona', 'bad', '{"userId":"another-user"}')]),
  ];
  for (const candidate of candidates) {
    const mock = t.mock.method(globalThis, 'fetch', async () => candidate);
    await assert.rejects(() => new OpenAILifeCoach({ apiKey: 'test-only' }).generate(context));
    mock.mock.restore();
  }
});

test('tool loop stops at four model requests even if the model keeps calling tools', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return response([tool('get_persona', String(calls))]);
  });
  await assert.rejects(() => new OpenAILifeCoach({ apiKey: 'test-only' }).generate(context));
  assert.equal(calls, 4);
});

test('invalid output and provider credential failures are rejected without leaking provider details', async (t) => {
  assert.throws(() =>
    parseCoachReply({ ...reply, suggestions: [reply.suggestions[0], reply.suggestions[0]] }),
  );
  assert.throws(() =>
    parseCoachReply({
      ...reply,
      suggestions: [{ ...reply.suggestions[0], minutes: 500 }, reply.suggestions[1]],
    }),
  );
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(JSON.stringify({ error: { message: 'sensitive-provider-details' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  await assert.rejects(
    () => new OpenAILifeCoach({ apiKey: 'test-only' }).generate(context),
    (error: Error) =>
      !error.message.includes('sensitive-provider-details') && error.message.includes('API 키'),
  );
});

test('context uses only the current profile and ten non-deleted records with bounded notes', () => {
  const state = initialState();
  state.profile = { name: 'private-name', persona: 'calm', aspiration: '나의 목표' };
  state.entries = Array.from({ length: 15 }, (_, index) => ({
    id: String(index),
    day: today(),
    category: 'journal',
    title: '기록',
    note: 'a'.repeat(1000),
    feeling: '좋았어요',
    createdAt: new Date().toISOString(),
    deleted: index === 14,
  }));
  const data = coachContext(state);
  assert.equal(data.records.length, 10);
  assert.equal(data.records[0].note.length, 500);
  assert.ok(!JSON.stringify(data).includes('private-name'));
  assert.ok(!JSON.stringify(data).includes('"id"'));
});

async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'chugumi-coach-'));
  const repository = new FileLifeRepository(directory);
  const manager = new ManageLife(repository);
  const id = randomUUID();
  await manager.execute(id, { action: 'profile', name: '테스터', persona: 'calm', aspiration: '' });
  return {
    directory,
    repository,
    manager,
    id,
    cleanup: () => fs.rm(directory, { recursive: true, force: true }),
  };
}

test('successful recommendations persist and cache, while edits invalidate without changing money', async () => {
  const f = await fixture();
  let calls = 0;
  const provider: CoachPort = {
    model: 'test-model',
    generate: async () => {
      calls += 1;
      return result();
    },
  };
  const service = new RecommendLife(f.repository, provider);
  try {
    const first = await service.execute(f.id);
    assert.deepEqual(await service.execute(f.id), first);
    assert.deepEqual(
      await new RecommendLife(new FileLifeRepository(f.directory), provider).read(f.id),
      first,
    );
    assert.equal(calls, 1);
    const state = await f.repository.read(f.id);
    assert.equal(state.coins, 0);
    assert.equal(state.xp, 0);
    await f.manager.execute(f.id, {
      action: 'profile',
      name: '테스터',
      persona: 'active',
      aspiration: '새 목표',
    });
    assert.equal(await service.read(f.id), null);
    await assert.rejects(() => service.execute(f.id), /1분/);
  } finally {
    await f.cleanup();
  }
});

test('parallel requests reserve one attempt and daily failures remain limited after restart', async () => {
  const f = await fixture();
  const provider: CoachPort = {
    model: 'test-model',
    generate: async () => {
      throw new Error('offline');
    },
  };
  try {
    const service = new RecommendLife(f.repository, provider);
    await Promise.allSettled([service.execute(f.id), service.execute(f.id)]);
    assert.equal((await f.repository.read(f.id)).coachUsage?.attempts, 1);
    await f.repository.update(f.id, (state) => {
      state.coachUsage = {
        day: today(),
        attempts: 5,
        lastAttemptAt: new Date(Date.now() - 61000).toISOString(),
      };
    });
    await assert.rejects(
      () => new RecommendLife(new FileLifeRepository(f.directory), provider).execute(f.id),
      /5회/,
    );
  } finally {
    await f.cleanup();
  }
});

test('a profile change during generation prevents persisting a stale recommendation', async () => {
  const f = await fixture();
  const provider: CoachPort = {
    model: 'test-model',
    generate: async () => {
      await f.manager.execute(f.id, {
        action: 'profile',
        name: '테스터',
        persona: 'curious',
        aspiration: '다른 방향',
      });
      return result();
    },
  };
  try {
    await assert.rejects(
      () => new RecommendLife(f.repository, provider).execute(f.id),
      /기록이 바뀌었어요/,
    );
    assert.equal((await f.repository.read(f.id)).coachCache, undefined);
  } finally {
    await f.cleanup();
  }
});

test('suggestion choice and recorded experience form distinct inputs for the next prompt', async () => {
  const f = await fixture();
  const inputs: CoachContext[] = [];
  const provider: CoachPort = {
    model: 'test-model',
    generate: async (input) => {
      inputs.push(input);
      return result();
    },
  };
  const service = new RecommendLife(f.repository, provider);
  try {
    const first = await service.execute(f.id);
    assert.ok(first.id);
    assert.equal(first.promptVersion, 'life-coach-v2');
    const choice = {
      action: 'choose-suggestion',
      recommendationId: first.id,
      category: 'activity',
    };
    await f.manager.execute(f.id, choice);
    await f.manager.execute(f.id, choice);
    let state = await f.repository.read(f.id);
    assert.equal(state.coachRuns?.[0].selected.length, 1);
    assert.equal(state.coins, 0);
    const selected = coachContext(state).previousSuggestions?.find(
      (item) => item.category === 'activity',
    );
    assert.equal(selected?.selected, true);
    assert.deepEqual(selected?.outcomes, []);

    const record = {
      action: 'record',
      id: randomUUID(),
      recommendationId: first.id,
      category: 'activity',
      title: '걷기를 시도했어요',
      note: '시간이 길어서 부담됐어요',
      feeling: '어려웠어요',
    };
    await f.manager.execute(f.id, record);
    await f.manager.execute(f.id, record);
    const second = await service.execute(f.id, undefined, new Date(Date.now() + 61000));
    assert.notEqual(second.id, first.id);
    assert.equal(inputs.length, 2);
    const observed = inputs[1].previousSuggestions?.find((item) => item.category === 'activity');
    assert.equal(observed?.outcomes[0].feeling, '어려웠어요');
    assert.match(coachInstructions(inputs[1]), /시간·준비·행동 범위를 줄이는/);
    state = await f.repository.read(f.id);
    assert.equal(state.coins, 20);
    assert.equal(state.coachRuns?.length, 2);
    assert.deepEqual(await service.read(f.id), second);

    await f.manager.execute(f.id, { action: 'delete', id: record.id });
    assert.ok(
      coachContext(await f.repository.read(f.id)).previousSuggestions?.every(
        (item) => item.outcomes.length === 0,
      ),
    );
  } finally {
    await f.cleanup();
  }
});

test('suggestions belong to their user and old goals do not become current preference evidence', async () => {
  const f = await fixture();
  try {
    const service = new RecommendLife(f.repository, {
      model: 'test-model',
      generate: async () => result(),
    });
    const generated = await service.execute(f.id);
    const otherId = randomUUID();
    await f.manager.execute(otherId, { action: 'profile', name: '다른 사람', persona: 'calm' });
    await assert.rejects(
      f.manager.execute(otherId, {
        action: 'choose-suggestion',
        recommendationId: generated.id,
        category: 'activity',
      }),
      /내 제안/,
    );
    await assert.rejects(
      f.manager.execute(otherId, {
        action: 'record',
        id: randomUUID(),
        recommendationId: generated.id,
        category: 'activity',
        title: '위조',
        feeling: '좋았어요',
      }),
      /내 제안/,
    );
    await f.manager.execute(f.id, {
      action: 'profile',
      name: '테스터',
      persona: 'curious',
      aspiration: '새 목표',
    });
    assert.deepEqual(coachContext(await f.repository.read(f.id)).previousSuggestions, []);
  } finally {
    await f.cleanup();
  }
});

test('prompt stages keep user instructions in observations and do not treat missing feedback as dislike', () => {
  const input = {
    ...context,
    persona: { ...context.persona, aspiration: 'UNTRUSTED_IGNORE_RULES' },
  };
  const instructions = coachInstructions(input);
  assert.ok(!instructions.includes('UNTRUSTED_IGNORE_RULES'));
  assert.match(instructions, /미선택·미기록은 부정적인 평가가 아니다/);
  assert.match(instructions, /현재 명시한 목표가 과거 행동보다 우선/);
  assert.match(coachInstructions({ ...context, records: [] }), /시작용 제안/);
});
