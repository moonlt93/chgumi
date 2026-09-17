import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { config } from 'dotenv';

import { ManageLife } from '../src/application/life/manage-life';
import { coachContext, RecommendLife } from '../src/application/life/recommend-life';
import { SupabaseLifeRepository } from '../src/infrastructure/life/supabase-life-repository';

config({ path: '.env.local', quiet: true });

async function main() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  assert.ok(url && secret, 'Supabase 환경변수 두 개가 필요합니다.');
  const userId = randomUUID();
  const repository = new SupabaseLifeRepository(url, secret);
  const manager = new ManageLife(repository);

  try {
    await manager.execute(userId, {
      action: 'profile',
      name: '연결 테스트',
      persona: 'calm',
      aspiration: '검증용 데이터',
    });
    const record = {
      action: 'record',
      id: randomUUID(),
      category: 'outfit',
      title: '검증용 코디',
      note: '',
      feeling: '좋았어요',
    };
    await Promise.all([manager.execute(userId, record), manager.execute(userId, record)]);
    const saved = await new SupabaseLifeRepository(url, secret).read(userId);
    assert.equal(saved.entries.length, 1);
    assert.equal(saved.coins, 20);
    assert.equal(saved.xp, 20);

    await Promise.all([
      manager.execute(userId, { action: 'buy', itemId: 'plant' }),
      manager.execute(userId, { action: 'buy', itemId: 'plant' }),
    ]);
    const bought = await repository.read(userId);
    assert.equal(bought.coins, 0);
    assert.deepEqual(bought.owned, ['plant']);
    assert.equal(bought.ledger.filter((entry) => entry.key === 'purchase:plant').length, 1);
    assert.equal((await repository.read(randomUUID())).profile, null);
    console.log('Supabase 실제 검증 통과: 저장·재조회·중복 기록·동시 구매·사용자 격리');

    const coach = new RecommendLife(repository, {
      model: 'storage-test-only',
      generate: async () => ({
        source: 'ai',
        model: 'storage-test-only',
        createdAt: new Date().toISOString(),
        toolsUsed: [],
        encouragement: '저장소 검증용 응답입니다.',
        suggestions: [
          {
            category: 'outfit',
            title: '검증용 코디',
            description: '테스트',
            reason: '테스트',
            minutes: 5,
          },
          {
            category: 'activity',
            title: '검증용 활동',
            description: '테스트',
            reason: '테스트',
            minutes: 5,
          },
        ],
      }),
    });
    const recommendation = await coach.execute(userId);
    await manager.execute(userId, {
      action: 'choose-suggestion',
      recommendationId: recommendation.id,
      category: 'activity',
    });
    assert.equal((await repository.read(userId)).coins, 0);
    await manager.execute(userId, {
      action: 'record',
      id: randomUUID(),
      recommendationId: recommendation.id,
      category: 'activity',
      title: '검증용 활동',
      note: '5분도 부담됐어요',
      feeling: '어려웠어요',
    });
    const restored = await new SupabaseLifeRepository(url, secret).read(userId);
    const experience = coachContext(restored).previousSuggestions?.find(
      (item) => item.category === 'activity',
    );
    assert.equal(experience?.selected, true);
    assert.equal(experience?.outcomes[0].feeling, '어려웠어요');
    assert.equal(restored.coachRuns?.[0].promptVersion, 'life-coach-v2');
    console.log('Supabase 제안·선택·실천 연결 저장 검증 통과 (모델 응답은 모킹, 유료 API 미호출)');
  } finally {
    const response = await fetch(new URL(`/rest/v1/life_states?user_id=eq.${userId}`, url), {
      method: 'DELETE',
      headers: { apikey: secret },
      signal: AbortSignal.timeout(10000),
    });
    assert.ok(response.ok, '이번 검증에서 생성한 테스트 데이터 정리에 실패했습니다.');
    console.log('이번 검증에서 생성한 테스트 데이터 정리 완료');
  }
}

main().catch(() => {
  console.error('Supabase 검증 실패. 환경변수, SQL 적용 여부 및 저장소 연결을 확인해 주세요.');
  process.exitCode = 1;
});
