import type {
  EvaluationInput,
  GenerationEvaluation,
  GenerationEvaluatorPort,
} from '@/domain/evaluation/model';
import type { ExperimentRepositoryPort } from '@/domain/learning/ports';

export class EvaluateGeneration {
  constructor(
    private repository: ExperimentRepositoryPort,
    private evaluator?: GenerationEvaluatorPort,
  ) {}

  async execute(input: EvaluationInput): Promise<GenerationEvaluation['status']> {
    const started = Date.now();
    const evaluation: GenerationEvaluation = {
      generationId: input.generation.id,
      evaluatorVersion: this.evaluator?.version ?? 'disabled',
      model: this.evaluator?.model ?? 'none',
      status: this.evaluator ? 'PENDING' : 'SKIPPED',
      findings: [],
      createdAt: new Date().toISOString(),
      durationMs: 0,
      ...(!this.evaluator ? { errorCode: 'DISABLED' as const } : {}),
    };
    await this.repository.saveEvaluation(evaluation);
    if (!this.evaluator) {
      return 'SKIPPED';
    }
    try {
      evaluation.findings = await this.evaluator.evaluate(input);
      evaluation.status = 'COMPLETED';
    } catch {
      // Provider payloads can contain image data; persist only the classified failure.
      evaluation.status = 'FAILED';
      evaluation.errorCode = 'EVALUATOR_ERROR';
    }
    evaluation.durationMs = Date.now() - started;
    await this.repository.saveEvaluation(evaluation);
    return evaluation.status;
  }
}
