import type { GenerationEvaluation } from '@/domain/evaluation/model';

import type { FeedbackInput } from './model';
import type {
  ExperimentContext,
  GenerationRecord,
  PromptVariant,
  StylingFeedback,
  VariantStats,
} from './model';

export interface ExperimentRepositoryPort {
  saveGeneration(record: GenerationRecord): Promise<void>;
  getGeneration(id: string): Promise<GenerationRecord | null>;
  append(feedback: FeedbackInput): Promise<StylingFeedback>;
  getFeedback(id: string): Promise<StylingFeedback[]>;
  listGenerations(): Promise<GenerationRecord[]>;
  saveEvaluation(evaluation: GenerationEvaluation): Promise<void>;
  getEvaluation(id: string): Promise<GenerationEvaluation | null>;
  stats(context: ExperimentContext): Promise<VariantStats[]>;
}

export interface VariantPolicyPort {
  choose(context: ExperimentContext, stats: VariantStats[]): PromptVariant;
}
