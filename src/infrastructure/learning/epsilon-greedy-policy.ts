import type { VariantPolicyPort } from '@/domain/learning/ports';
import type { ExperimentContext, PromptVariant, VariantStats } from '@/domain/learning/model';
const VARIANTS: PromptVariant[] = ['CONTROL','PRESERVE_FIRST','STYLE_FIRST'];
export class EpsilonGreedyPolicy implements VariantPolicyPort {
  constructor(private readonly epsilon = Number(process.env.EXPERIMENT_EPSILON || 0.15)) {}
  choose(_context: ExperimentContext, stats: VariantStats[]): PromptVariant {
    if (Math.random() < this.epsilon) return VARIANTS[Math.floor(Math.random()*VARIANTS.length)];
    const map = new Map(stats.map(s => [s.variant, s]));
    return [...VARIANTS].sort((a,b) => (map.get(b)?.rewardRate ?? 0.5) - (map.get(a)?.rewardRate ?? 0.5))[0];
  }
}
