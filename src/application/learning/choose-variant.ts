import type { ExperimentContext } from '@/domain/learning/model';
import type { ExperimentRepositoryPort, VariantPolicyPort } from '@/domain/learning/ports';

export class ChooseVariant {
  constructor(
    private repository: ExperimentRepositoryPort,
    private policy: VariantPolicyPort,
  ) {}

  async execute(context: ExperimentContext) {
    const stats = await this.repository.stats(context);

    return { variant: this.policy.choose(context, stats), stats };
  }
}
