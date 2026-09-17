import {
  COMPARISON_CHOICES,
  FEEDBACK_REASONS,
  FEEDBACK_SIGNALS,
  type FeedbackInput,
} from '@/domain/learning/model';
import type { ExperimentRepositoryPort } from '@/domain/learning/ports';
import { InvalidStylingRequestError } from '@/domain/styling/errors';

export const isRecordId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export class RecordFeedback {
  constructor(private repository: ExperimentRepositoryPort) {}

  async read(generationId: unknown, sessionId: string) {
    await this.requireOwnedGeneration(generationId, sessionId);
    return this.repository.getFeedback(generationId as string);
  }

  private async requireOwnedGeneration(generationId: unknown, sessionId: string) {
    if (!isRecordId(generationId)) {
      throw new InvalidStylingRequestError();
    }
    const generation = await this.repository.getGeneration(generationId);
    if (!generation || generation.sessionId !== sessionId || generation.status !== 'SUCCEEDED') {
      throw new InvalidStylingRequestError('피드백을 보낼 수 없는 결과입니다.');
    }
    return generation;
  }

  async execute(input: unknown, sessionId: string) {
    if (!input || typeof input !== 'object') {
      throw new InvalidStylingRequestError();
    }
    const body = input as Record<string, unknown>;
    if (
      !isRecordId(body.eventId) ||
      !isRecordId(body.generationId) ||
      !FEEDBACK_SIGNALS.includes(body.signal as never)
    ) {
      throw new InvalidStylingRequestError();
    }
    if (body.reason !== undefined && !FEEDBACK_REASONS.includes(body.reason as never)) {
      throw new InvalidStylingRequestError();
    }
    if (
      body.signal === 'REPORT' &&
      !['IDENTITY_CHANGED', 'BODY_CHANGED'].includes(body.reason as string)
    ) {
      throw new InvalidStylingRequestError('품질 문제의 종류를 선택해 주세요.');
    }
    if (body.reason !== undefined && !['REPORT', 'DISLIKE'].includes(body.signal as string)) {
      throw new InvalidStylingRequestError();
    }
    if (
      body.signal === 'COMPARE'
        ? !COMPARISON_CHOICES.includes(body.comparison as never)
        : body.comparison !== undefined
    ) {
      throw new InvalidStylingRequestError();
    }
    const generation = await this.requireOwnedGeneration(body.generationId, sessionId);
    if (body.signal === 'COMPARE' && !generation.parentGenerationId) {
      throw new InvalidStylingRequestError('비교할 이전 결과가 없습니다.');
    }
    const feedback: FeedbackInput = {
      eventId: body.eventId,
      generationId: generation.id,
      signal: body.signal as FeedbackInput['signal'],
      ...(body.reason ? { reason: body.reason as FeedbackInput['reason'] } : {}),
      ...(body.comparison ? { comparison: body.comparison as FeedbackInput['comparison'] } : {}),
    };
    return this.repository.append(feedback);
  }
}
