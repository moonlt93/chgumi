import type { Category } from '../../domain/life/catalog';
import { CATEGORIES, FEELINGS, PERSONAS, REWARDS, SHOP } from '../../domain/life/catalog';
import type { LifeRepository } from '../../domain/life/model';
import { LifeError } from '../../domain/life/model';

function string(value: unknown, max: number, optional = false): string {
  if (typeof value !== 'string' || value.trim().length > max || (!optional && !value.trim())) {
    throw new LifeError('입력 내용과 길이를 확인해 주세요.');
  }
  return value.trim();
}
export function today(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now);
}
export class ManageLife {
  constructor(private readonly repository: LifeRepository) {}

  async execute(userId: string, input: unknown, now = new Date()) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new LifeError('요청 형식이 올바르지 않습니다.');
    }
    const body = input as Record<string, unknown>;
    return this.repository.update(userId, (state) => {
      const createdAt = now.toISOString();
      if (body.action === 'profile') {
        const persona = string(body.persona, 30);
        if (!PERSONAS.some((item) => item.id === persona)) {
          throw new LifeError('페르소나를 선택해 주세요.');
        }
        state.profile = {
          name: string(body.name, 20),
          persona,
          aspiration: string(body.aspiration ?? '', 160, true),
        };
        delete state.coachCache;
        return;
      }
      if (!state.profile) {
        throw new LifeError('먼저 원하는 모습을 정해 주세요.');
      }
      if (body.action === 'choose-suggestion') {
        const run = state.coachRuns?.find((item) => item.id === body.recommendationId);
        const suggestion = run?.result.suggestions.find((item) => item.category === body.category);
        if (!run || !suggestion) {
          throw new LifeError('내 제안을 찾을 수 없습니다. 다시 불러와 주세요.');
        }
        if (!run.selected.some((item) => item.category === suggestion.category)) {
          run.selected.push({ category: suggestion.category, selectedAt: createdAt });
          delete state.coachCache;
        }
        return;
      }
      if (body.action === 'record') {
        const id = string(body.id, 36);
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
          throw new LifeError('기록 ID가 올바르지 않습니다.');
        }
        const category = string(body.category, 20) as Category;
        if (!CATEGORIES.includes(category)) {
          throw new LifeError('기록 종류를 선택해 주세요.');
        }
        const title = string(body.title, 100);
        const note = string(body.note ?? '', 1000, true);
        const feeling = string(body.feeling, 30);
        if (!FEELINGS.some((item) => item === feeling)) {
          throw new LifeError('느낌을 선택해 주세요.');
        }
        const recommendationId =
          body.recommendationId === undefined ? undefined : string(body.recommendationId, 36);
        const existing = state.entries.find((entry) => entry.id === id);
        if (existing) {
          if (
            existing.category !== category ||
            existing.title !== title ||
            existing.note !== note ||
            existing.feeling !== feeling ||
            existing.recommendationId !== recommendationId
          ) {
            throw new LifeError('이미 처리한 기록입니다. 새 기록을 시작해 주세요.');
          }
          return;
        }
        if (recommendationId) {
          const run = state.coachRuns?.find((item) => item.id === recommendationId);
          if (!run?.result.suggestions.some((item) => item.category === category)) {
            throw new LifeError('내 제안에 연결할 수 없습니다. 직접 기록으로 남겨 주세요.');
          }
        }
        const day = today(now);
        if (state.entries.filter((entry) => entry.day === day).length >= 20) {
          throw new LifeError('오늘 기록은 최대 20개까지 남길 수 있어요.');
        }
        state.entries.push({
          id,
          category,
          title,
          note,
          feeling,
          day,
          createdAt,
          ...(recommendationId ? { recommendationId } : {}),
        });
        delete state.coachCache;
        const key = `reward:${day}:${category}`;
        if (!state.ledger.some((entry) => entry.key === key)) {
          const reward = REWARDS[category];
          state.xp += reward.xp;
          state.coins += reward.coins;
          state.ledger.push({ key, ...reward, createdAt });
        }
        return;
      }
      if (body.action === 'edit' || body.action === 'delete') {
        const entry = state.entries.find((item) => item.id === body.id && !item.deleted);
        if (!entry) {
          throw new LifeError('기록을 찾을 수 없습니다.');
        }
        delete state.coachCache;
        if (body.action === 'delete') {
          entry.deleted = true;
          entry.title = '';
          entry.note = '';
          entry.feeling = '';
        } else {
          entry.note = string(body.note, 1000, true);
        }
        return;
      }
      if (body.action === 'buy' || body.action === 'equip') {
        const item = SHOP.find((product) => product.id === body.itemId);
        if (!item) {
          throw new LifeError('물품을 찾을 수 없습니다.');
        }
        if (body.action === 'buy') {
          if (state.owned.includes(item.id)) {
            return;
          }
          if (state.coins < item.price) {
            throw new LifeError('코인이 부족해요. 작은 실천을 기록해 보세요.');
          }
          state.coins -= item.price;
          state.owned.push(item.id);
          state.ledger.push({ key: `purchase:${item.id}`, xp: 0, coins: -item.price, createdAt });
        } else {
          if (!state.owned.includes(item.id)) {
            throw new LifeError('먼저 구매한 물품만 사용할 수 있어요.');
          }
          state.equipped[item.slot] = item.id;
        }
        return;
      }
      if (body.action === 'unequip') {
        if (!SHOP.some((item) => item.slot === body.slot)) {
          throw new LifeError('꾸미기 위치가 올바르지 않습니다.');
        }
        delete state.equipped[body.slot as keyof typeof state.equipped];
        return;
      }
      throw new LifeError('지원하지 않는 요청입니다.');
    });
  }
}
