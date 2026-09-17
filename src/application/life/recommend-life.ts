import { createHash, randomUUID } from 'node:crypto';

import { CATEGORIES, PERSONAS } from '../../domain/life/catalog';
import type { CoachContext, CoachPort } from '../../domain/life/coach';
import { COACH_PROMPT_VERSION, CoachError } from '../../domain/life/coach';
import type { LifeRepository, LifeState } from '../../domain/life/model';
import { today } from './manage-life';

export function coachContext(state: LifeState, now = new Date()): CoachContext {
  const persona = PERSONAS.find((item) => item.id === state.profile?.persona);
  if (!state.profile || !persona) {
    throw new CoachError('먼저 나의 방향을 정해 주세요.', 400);
  }
  const day = today(now);
  return {
    persona: {
      name: persona.name,
      description: persona.description,
      aspiration: state.profile.aspiration,
    },
    records: state.entries
      .filter((entry) => !entry.deleted)
      .slice(-10)
      .map((entry) => ({
        day: entry.day,
        category: entry.category,
        title: entry.title,
        note: entry.note.slice(0, 500),
        feeling: entry.feeling,
      })),
    rewards: {
      day,
      completedCategories: CATEGORIES.filter((category) =>
        state.ledger.some((entry) => entry.key === `reward:${day}:${category}`),
      ),
    },
    previousSuggestions: (state.coachRuns ?? [])
      .filter(
        (run) =>
          run.persona === state.profile?.persona && run.aspiration === state.profile.aspiration,
      )
      .slice(-5)
      .flatMap((run) =>
        run.result.suggestions.map((suggestion) => ({
          category: suggestion.category,
          title: suggestion.title,
          minutes: suggestion.minutes,
          selected: run.selected.some((selection) => selection.category === suggestion.category),
          outcomes: state.entries
            .filter(
              (entry) =>
                !entry.deleted &&
                entry.recommendationId === run.id &&
                entry.category === suggestion.category,
            )
            .slice(-3)
            .map((entry) => ({
              title: entry.title,
              feeling: entry.feeling,
              note: entry.note.slice(0, 500),
            })),
        })),
      ),
  };
}

function fingerprint(context: CoachContext, model: string) {
  return createHash('sha256')
    .update(JSON.stringify({ version: COACH_PROMPT_VERSION, model, context }))
    .digest('hex');
}

export class RecommendLife {
  constructor(
    private readonly repository: LifeRepository,
    private readonly provider: CoachPort,
  ) {}

  async read(userId: string, now = new Date()) {
    const state = await this.repository.read(userId);
    const key = fingerprint(coachContext(state, now), this.provider.model);
    return state.coachCache?.fingerprint === key ? state.coachCache.result : null;
  }

  async execute(userId: string, signal?: AbortSignal, now = new Date()) {
    let cached = false;
    const reserved = await this.repository.update(userId, (state) => {
      cached = false;
      const key = fingerprint(coachContext(state, now), this.provider.model);
      if (state.coachCache?.fingerprint === key) {
        cached = true;
        return;
      }
      const usage = state.coachUsage;
      if (usage && now.getTime() - Date.parse(usage.lastAttemptAt) < 60000) {
        throw new CoachError('새 제안은 1분 뒤에 다시 요청할 수 있어요.', 429);
      }
      const attempts = usage?.day === today(now) ? usage.attempts : 0;
      if (attempts >= 5) {
        throw new CoachError(
          '오늘 AI 제안 요청 5회를 모두 사용했어요. 기존 제안과 직접 기록은 계속 사용할 수 있어요.',
          429,
        );
      }
      state.coachUsage = {
        day: today(now),
        attempts: attempts + 1,
        lastAttemptAt: now.toISOString(),
      };
    });
    if (cached && reserved.coachCache) {
      return reserved.coachCache.result;
    }
    const context = coachContext(reserved, now);
    const key = fingerprint(context, this.provider.model);
    const generated = await this.provider.generate(context, signal);
    const result = { ...generated, id: randomUUID(), promptVersion: COACH_PROMPT_VERSION };
    await this.repository.update(userId, (state) => {
      if (fingerprint(coachContext(state), this.provider.model) !== key) {
        throw new CoachError(
          '제안을 만드는 동안 기록이 바뀌었어요. 최신 기록으로 다시 요청해 주세요.',
          409,
        );
      }
      state.coachRuns = [
        ...(state.coachRuns ?? []),
        {
          id: result.id,
          persona: state.profile!.persona,
          aspiration: state.profile!.aspiration,
          promptVersion: COACH_PROMPT_VERSION,
          inputRecordCount: context.records.length,
          result,
          selected: [],
        },
      ].slice(-20);
      state.coachCache = {
        fingerprint: fingerprint(coachContext(state), this.provider.model),
        result,
      };
    });
    return result;
  }
}
