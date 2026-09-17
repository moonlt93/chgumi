import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ManageLife, today } from '../src/application/life/manage-life';
import { FileLifeRepository } from '../src/infrastructure/life/file-life-repository';

const date = new Date('2026-09-17T01:00:00Z');
async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'chugumi-life-'));
  const repository = new FileLifeRepository(directory);
  const manager = new ManageLife(repository);
  const id = randomUUID();
  await manager.execute(
    id,
    { action: 'profile', name: '테스터', persona: 'calm', aspiration: '작은 실천' },
    date,
  );
  return {
    directory,
    repository,
    manager,
    id,
    cleanup: () => fs.rm(directory, { recursive: true, force: true }),
  };
}
function record(category = 'activity') {
  return {
    action: 'record',
    id: randomUUID(),
    category,
    title: '오늘의 실천',
    note: '조금 걸었어요',
    feeling: '좋았어요',
  };
}
test('same record replay and same-day category records earn one reward, including after deletion', async () => {
  const f = await fixture();
  try {
    const request = record();
    await Promise.all(Array.from({ length: 5 }, () => f.manager.execute(f.id, request, date)));
    let state = await f.repository.read(f.id);
    assert.equal(state.entries.length, 1);
    assert.equal(state.coins, 20);
    await f.manager.execute(f.id, { action: 'delete', id: request.id }, date);
    state = await f.manager.execute(f.id, record(), date);
    assert.equal(state.coins, 20);
    assert.equal(state.xp, 20);
    assert.equal(state.entries[0].note, '');
    await assert.rejects(() => f.manager.execute(f.id, { ...request, note: 'changed' }, date));
  } finally {
    await f.cleanup();
  }
});
test('concurrent duplicate purchases debit once and only owned items may be equipped', async () => {
  const f = await fixture();
  try {
    await assert.rejects(() => f.manager.execute(f.id, { action: 'equip', itemId: 'plant' }, date));
    await assert.rejects(() => f.manager.execute(f.id, { action: 'buy', itemId: 'plant' }, date));
    await f.manager.execute(f.id, record(), date);
    const otherManager = new ManageLife(new FileLifeRepository(f.directory));
    await Promise.all(
      [f.manager, otherManager].map((manager) =>
        manager.execute(f.id, { action: 'buy', itemId: 'plant' }, date),
      ),
    );
    let state = await f.repository.read(f.id);
    assert.equal(state.coins, 0);
    assert.deepEqual(state.owned, ['plant']);
    assert.equal(state.xp, 20);
    await f.manager.execute(f.id, { action: 'equip', itemId: 'plant' }, date);
    state = await new FileLifeRepository(f.directory).read(f.id);
    assert.equal(state.equipped.plant, 'plant');
    state = await f.manager.execute(f.id, { action: 'unequip', slot: 'plant' }, date);
    assert.equal(state.equipped.plant, undefined);
  } finally {
    await f.cleanup();
  }
});
test('racing purchases never overspend and failed writes do not block future changes', async () => {
  const f = await fixture();
  try {
    await f.manager.execute(f.id, record(), date);
    await f.manager.execute(f.id, record('outfit'), date);
    const results = await Promise.allSettled(
      ['plant', 'lamp'].map((itemId) => f.manager.execute(f.id, { action: 'buy', itemId }, date)),
    );
    assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
    const state = await f.manager.execute(f.id, record('journal'), date);
    assert.equal(state.coins, 30);
    assert.equal(state.xp, 50);
  } finally {
    await f.cleanup();
  }
});
test('Korean day boundary gives next-day reward while edits give none', async () => {
  const f = await fixture();
  try {
    const request = record();
    assert.equal(today(new Date('2026-09-17T15:00:00Z')), '2026-09-18');
    await f.manager.execute(f.id, request, date);
    let state = await f.manager.execute(
      f.id,
      { action: 'edit', id: request.id, note: '수정했어요' },
      date,
    );
    assert.equal(state.coins, 20);
    state = await f.manager.execute(f.id, record(), new Date('2026-09-17T15:00:00Z'));
    assert.equal(state.coins, 40);
  } finally {
    await f.cleanup();
  }
});
test('invalid inputs cannot forge currency and different users have separate state', async () => {
  const f = await fixture();
  try {
    for (const body of [
      { ...record(), category: 'fake' },
      { ...record(), feeling: 'fake' },
      { ...record(), title: 'x'.repeat(101) },
      { action: 'coins', coins: 10000 },
    ]) {
      await assert.rejects(() => f.manager.execute(f.id, body, date));
    }
    const state = await f.manager.execute(f.id, { ...record(), coins: 10000, xp: 10000 }, date);
    assert.equal(state.coins, 20);
    assert.equal((await f.repository.read(randomUUID())).coins, 0);
    await assert.rejects(() => f.repository.read('../escape'));
  } finally {
    await f.cleanup();
  }
});
test('corrupt saved state fails closed instead of silently replacing user data', async () => {
  const f = await fixture();
  try {
    const file = path.join(f.directory, `${f.id}.json`);
    await fs.writeFile(file, '{broken');
    await assert.rejects(() => f.manager.execute(f.id, record(), date));
    assert.equal(await fs.readFile(file, 'utf8'), '{broken');
  } finally {
    await f.cleanup();
  }
});
