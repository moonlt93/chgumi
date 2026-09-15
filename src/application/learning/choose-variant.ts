import type { ExperimentRepositoryPort, VariantPolicyPort } from '@/domain/learning/ports'; import type { ExperimentContext } from '@/domain/learning/model';
export class ChooseVariant { constructor(private repo:ExperimentRepositoryPort,private policy:VariantPolicyPort){} async execute(c:ExperimentContext){const stats=await this.repo.stats(c);return {variant:this.policy.choose(c,stats),stats};} }
