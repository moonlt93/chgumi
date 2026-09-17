import {
  type ExperimentContext,
  PROMPT_VARIANTS,
  type PromptVariant,
  type VariantStats,
} from '@/domain/learning/model';
import type { VariantPolicyPort } from '@/domain/learning/ports';

export class EpsilonGreedyPolicy implements VariantPolicyPort {
  constructor(
    private readonly epsilon = Number(process.env.EXPERIMENT_EPSILON || 0.15),
    private readonly random = Math.random,
  ) {
    if (!Number.isFinite(epsilon) || epsilon < 0 || epsilon > 1) {
      throw new Error('EXPERIMENT_EPSILON must be between 0 and 1');
    }
  }

  choose(_context: ExperimentContext, stats: VariantStats[]): PromptVariant {
    const sample = (variants: readonly PromptVariant[]) =>
      variants[Math.floor(this.random() * variants.length)];

    if (this.random() < this.epsilon) {
      return sample(PROMPT_VARIANTS);
    }

    const rates = new Map(stats.map((stat) => [stat.variant, stat.rewardRate]));
    const best = Math.max(...PROMPT_VARIANTS.map((variant) => rates.get(variant) ?? 0.5));

    return sample(PROMPT_VARIANTS.filter((variant) => (rates.get(variant) ?? 0.5) === best));
  }
}
