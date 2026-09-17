import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { GenerationEvaluation } from '@/domain/evaluation/model';
import {
  type ExperimentContext,
  type FeedbackInput,
  type GenerationRecord,
  PROMPT_VARIANTS,
  type StylingFeedback,
  type VariantStats,
} from '@/domain/learning/model';
import type { ExperimentRepositoryPort } from '@/domain/learning/ports';
import { generationReward } from '@/domain/learning/reward';
import { InvalidStylingRequestError } from '@/domain/styling/errors';

const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
// Serialize ledger changes across repository instances in this Node process.
const writes = new Map<string, Promise<unknown>>();

export class FileExperimentRepository implements ExperimentRepositoryPort {
  constructor(
    private readonly directory = process.env.EXPERIMENT_DATA_DIR ||
      path.join(process.cwd(), 'data', 'experiments'),
  ) {}

  private generationPath(id: string) {
    if (!validId(id)) {
      throw new InvalidStylingRequestError('Invalid generation ID');
    }
    return path.resolve(this.directory, id);
  }

  private async readJson<T>(filename: string): Promise<T | null> {
    try {
      return JSON.parse(await fs.readFile(filename, 'utf8')) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private async writeJson(filename: string, value: unknown) {
    await fs.mkdir(path.dirname(filename), { recursive: true });
    const temporaryPath = `${filename}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, JSON.stringify(value));
      await fs.rename(temporaryPath, filename);
    } finally {
      await fs.unlink(temporaryPath).catch((error) => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      });
    }
  }

  async saveGeneration(record: GenerationRecord) {
    await this.writeJson(path.join(this.generationPath(record.id), 'generation.json'), record);
  }

  getGeneration(id: string): Promise<GenerationRecord | null> {
    return this.readJson(path.join(this.generationPath(id), 'generation.json'));
  }

  async listGenerations(): Promise<GenerationRecord[]> {
    let ids: string[];
    try {
      ids = await fs.readdir(this.directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
    const records = await Promise.all(ids.filter(validId).map((id) => this.getGeneration(id)));
    return records
      .filter((record): record is GenerationRecord => record !== null)
      .sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id),
      );
  }

  async getFeedback(id: string): Promise<StylingFeedback[]> {
    const directory = this.generationPath(id);
    const events = await this.readJson<StylingFeedback[]>(
      path.join(directory, 'feedback-events.json'),
    );
    if (events) {
      return events;
    }
    // Read old immutable signal files once; the first new event materializes the ledger.
    const legacy: StylingFeedback[] = [];
    for (const signal of ['LIKE', 'DISLIKE', 'DOWNLOAD'] as const) {
      const feedback = await this.readJson<{ createdAt: string }>(
        path.join(directory, `${signal}.json`),
      );
      if (feedback) {
        legacy.push({
          eventId: `legacy-${signal}`,
          generationId: id,
          signal,
          createdAt: feedback.createdAt,
          sequence: 0,
        });
      }
    }
    return legacy
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((event, index) => ({ ...event, sequence: index + 1 }));
  }

  async append(input: FeedbackInput): Promise<StylingFeedback> {
    const filename = path.join(this.generationPath(input.generationId), 'feedback-events.json');
    const previous = writes.get(filename) ?? Promise.resolve();
    const operation = previous
      .catch(() => undefined)
      .then(async () => {
        const events = await this.getFeedback(input.generationId);
        const existing = events.find((event) => event.eventId === input.eventId);
        if (existing) {
          if (
            existing.signal !== input.signal ||
            existing.reason !== input.reason ||
            existing.comparison !== input.comparison
          ) {
            throw new InvalidStylingRequestError('같은 이벤트 ID로 의견을 변경할 수 없습니다.');
          }
          return existing;
        }
        const event: StylingFeedback = {
          ...input,
          createdAt: new Date().toISOString(),
          sequence: events.length + 1,
        };
        await this.writeJson(filename, [...events, event]);
        return event;
      });
    writes.set(filename, operation);
    try {
      return await operation;
    } finally {
      if (writes.get(filename) === operation) {
        writes.delete(filename);
      }
    }
  }

  async saveEvaluation(evaluation: GenerationEvaluation) {
    await this.writeJson(
      path.join(this.generationPath(evaluation.generationId), 'evaluation.json'),
      evaluation,
    );
  }

  getEvaluation(id: string): Promise<GenerationEvaluation | null> {
    return this.readJson(path.join(this.generationPath(id), 'evaluation.json'));
  }

  async stats(context: ExperimentContext): Promise<VariantStats[]> {
    const generations = (await this.listGenerations()).filter(
      (record) =>
        record.context.occasion === context.occasion &&
        record.context.vibe === context.vibe &&
        !record.parentGenerationId,
    );
    const trials = await Promise.all(
      generations.map(async (record) => ({
        record,
        reward: generationReward(await this.getFeedback(record.id)),
      })),
    );
    return PROMPT_VARIANTS.map((variant) => {
      const matching = trials.filter((entry) => entry.record.variant === variant);
      const successes = matching.filter((entry) => entry.record.status === 'SUCCEEDED');
      const outcomes = successes.filter((entry) => entry.reward !== null);
      const rewards = outcomes.reduce((sum, entry) => sum + (entry.reward ?? 0), 0);
      return {
        variant,
        impressions: successes.length,
        failures: matching.filter((entry) => entry.record.status === 'FAILED').length,
        feedbackCount: outcomes.length,
        rewards,
        rewardRate: outcomes.length ? rewards / outcomes.length : 0.5,
        positivePerGeneration: successes.length ? rewards / successes.length : null,
      };
    });
  }
}
