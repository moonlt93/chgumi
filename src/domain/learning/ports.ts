import type { ExperimentContext, PromptVariant, StylingFeedback, VariantStats } from './model';
export interface ExperimentRepositoryPort {
  append(feedback: StylingFeedback): Promise<void>;
  stats(context: ExperimentContext): Promise<VariantStats[]>;
}
export interface VariantPolicyPort { choose(context: ExperimentContext, stats: VariantStats[]): PromptVariant; }
