import type { GenerationEvaluation } from '@/domain/evaluation/model';
import type { GenerationRecord, StylingFeedback } from '@/domain/learning/model';
import type { ExperimentRepositoryPort } from '@/domain/learning/ports';
import { latestFeedback } from '@/domain/learning/reward';

export type ReviewItem = {
  generation: Omit<GenerationRecord, 'sessionId' | 'sourceHash'>;
  evaluation: GenerationEvaluation | null;
  events: StylingFeedback[];
  latestVote: StylingFeedback | null;
  latestComparison: StylingFeedback | null;
  disagreements: string[];
};

export class ListReviews {
  constructor(private repository: ExperimentRepositoryPort) {}
  async execute(offset = 0, limit = 20): Promise<{ items: ReviewItem[]; total: number }> {
    const generations = await this.repository.listGenerations();
    const items = await Promise.all(
      generations.slice(offset, offset + limit).map(async (record) => {
        const [evaluation, events] = await Promise.all([
          this.repository.getEvaluation(record.id),
          this.repository.getFeedback(record.id),
        ]);
        const disagreements: string[] = [];
        for (const [criterion, reason] of [
          ['identity', 'IDENTITY_CHANGED'],
          ['body', 'BODY_CHANGED'],
        ] as const) {
          if (
            evaluation?.status === 'COMPLETED' &&
            evaluation.findings.some(
              (finding) => finding.criterion === criterion && finding.verdict === 'pass',
            ) &&
            events.some((event) => event.signal === 'REPORT' && event.reason === reason)
          ) {
            disagreements.push(criterion);
          }
        }
        // Select fields explicitly so private identifiers cannot reach the review API.
        const generation = {
          id: record.id,
          context: record.context,
          variant: record.variant,
          promptVersion: record.promptVersion,
          preferences: record.preferences,
          refinements: record.refinements,
          parentGenerationId: record.parentGenerationId,
          status: record.status,
          createdAt: record.createdAt,
          durationMs: record.durationMs,
        };
        return {
          generation,
          evaluation,
          events,
          latestVote: latestFeedback(events, ['LIKE', 'DISLIKE']),
          latestComparison: latestFeedback(events, ['COMPARE']),
          disagreements,
        };
      }),
    );
    return { items, total: generations.length };
  }
}
