import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { ManageLife } from '../src/application/life/manage-life';
import type { LifeState } from '../src/domain/life/model';
import { initialState } from '../src/domain/life/model';
import { aiAvailable, sameOrigin } from '../src/infrastructure/config/server-environment';
import { createLifeRepository } from '../src/infrastructure/life/life-repository';
import { SupabaseLifeRepository } from '../src/infrastructure/life/supabase-life-repository';

function database() {
  const rows = new Map<string, { revision: number; state: LifeState }>();
  const request: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (init?.method === 'GET') {
      const row = rows.get(url.searchParams.get('user_id')!.slice(3));
      return Response.json(row ? [row] : []);
    }
    const body = JSON.parse(String(init?.body));
    const row = rows.get(body.p_user_id);
    if ((row?.revision ?? 0) !== body.p_revision) {
      return Response.json(false);
    }
    rows.set(body.p_user_id, { revision: body.p_revision + 1, state: body.p_state });
    return Response.json(true);
  };
  return { request, rows };
}

test('Supabase retries conflicts across repository instances without duplicate reward or debit', async () => {
  const db = database();
  const first = new SupabaseLifeRepository('https://example.supabase.co', 'test', db.request);
  const second = new SupabaseLifeRepository('https://example.supabase.co', 'test', db.request);
  const managers = [new ManageLife(first), new ManageLife(second)];
  const id = randomUUID();
  await managers[0].execute(id, { action: 'profile', name: '테스터', persona: 'calm' });
  const record = {
    action: 'record',
    id: randomUUID(),
    category: 'outfit',
    title: '코디',
    feeling: '좋았어요',
  };
  await Promise.all(managers.map((manager) => manager.execute(id, record)));
  assert.equal((await second.read(id)).coins, 20);
  assert.equal((await second.read(id)).entries.length, 1);
  await Promise.all(
    managers.map((manager) => manager.execute(id, { action: 'buy', itemId: 'plant' })),
  );
  const result = await first.read(id);
  assert.equal(result.coins, 0);
  assert.deepEqual(result.owned, ['plant']);
  assert.equal(result.ledger.length, 2);
  assert.deepEqual(await second.read(randomUUID()), initialState());
});

test('Supabase rejects corrupt responses and bounds repeated write conflicts', async () => {
  let writes = 0;
  const conflicts: typeof fetch = async (_input, init) => {
    if (init?.method === 'POST') {
      writes += 1;
      return Response.json(false);
    }
    return Response.json([]);
  };
  const repository = new SupabaseLifeRepository('https://example.supabase.co', 'test', conflicts);
  await assert.rejects(
    repository.update(randomUUID(), (state) => {
      state.coins += 1;
    }),
    /동시에/,
  );
  assert.equal(writes, 5);
  const corrupt = new SupabaseLifeRepository('https://example.supabase.co', 'test', async () =>
    Response.json([{ revision: 1, state: { coins: -1 } }]),
  );
  await assert.rejects(corrupt.read(randomUUID()), /형식/);
  await assert.rejects(repository.read('invalid'), /식별자/);
});

test('Supabase errors never reveal upstream response details or fall back to file storage', async () => {
  for (const status of [401, 403, 404, 500]) {
    const repository = new SupabaseLifeRepository(
      'https://example.supabase.co',
      'test-secret',
      async () => new Response('private upstream detail', { status }),
    );
    await assert.rejects(
      repository.read(randomUUID()),
      (error: Error) =>
        !error.message.includes('private') && !error.message.includes('test-secret'),
    );
  }
  assert.throws(() => createLifeRepository({ VERCEL: '1' }), /모두/);
  assert.throws(
    () => createLifeRepository({ SUPABASE_URL: 'https://example.supabase.co' }),
    /모두/,
  );
  assert.ok(
    createLifeRepository({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SECRET_KEY: 'test',
    }) instanceof SupabaseLifeRepository,
  );
});

test('Vercel requires explicit live mode for AI; demo always disables it', () => {
  assert.equal(aiAvailable({ VERCEL: '1', VERCEL_ENV: 'preview', OPENAI_API_KEY: 'test' }), false);
  assert.equal(
    aiAvailable({ VERCEL: '1', VERCEL_ENV: 'production', OPENAI_API_KEY: 'test' }),
    false,
  );
  assert.equal(aiAvailable({ VERCEL: '1', AI_MODE: 'live', OPENAI_API_KEY: 'test' }), true);
  assert.equal(aiAvailable({ AI_MODE: 'demo', OPENAI_API_KEY: 'test' }), false);
  assert.equal(aiAvailable({ AI_MODE: 'live' }), false);
});

test('origin policy supports configured domain and preview URL without wildcard or malformed origins', () => {
  const request = (origin: string) =>
    new Request('https://internal.example/api/life', {
      headers: { origin, host: 'internal.example' },
    });
  const production = { APP_URL: 'https://chgumi.vercel.app' };
  assert.equal(
    sameOrigin(request('https://chgumi.vercel.app'), { VERCEL_ENV: 'production' }),
    true,
  );
  assert.equal(
    sameOrigin(request('https://chgumi.vercel.app'), {
      VERCEL_ENV: 'preview',
      VERCEL_URL: 'preview.vercel.app',
    }),
    false,
  );
  assert.equal(sameOrigin(request('https://chgumi.vercel.app'), production), true);
  assert.equal(sameOrigin(request('https://other.vercel.app'), production), false);
  assert.equal(sameOrigin(request('http://chgumi.vercel.app'), production), false);
  assert.equal(sameOrigin(request('https://chgumi.vercel.app/path'), production), false);
  assert.equal(sameOrigin(request('malformed'), production), false);
  assert.equal(
    sameOrigin(request('https://preview.vercel.app'), { VERCEL_URL: 'preview.vercel.app' }),
    true,
  );
  const local = new Request('http://localhost:3100/api/life', {
    headers: { origin: 'http://127.0.0.1:3100', host: '127.0.0.1:3100' },
  });
  assert.equal(sameOrigin(local, {}), true);
});
