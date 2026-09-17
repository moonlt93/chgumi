import type { GenerationRecord } from '@/domain/learning/model';
import type { GeneratedImage } from '@/domain/styling/model';

export const EVALUATION_CRITERIA = ['identity', 'body', 'constraints', 'styling'] as const;
export type EvaluationCriterion = (typeof EVALUATION_CRITERIA)[number];
export type EvaluationVerdict = 'pass' | 'fail' | 'uncertain';
export type EvaluationFinding = {
  criterion: EvaluationCriterion;
  verdict: EvaluationVerdict;
  reason: string;
};
export type GenerationEvaluation = {
  generationId: string;
  evaluatorVersion: string;
  model: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  findings: EvaluationFinding[];
  createdAt: string;
  durationMs: number;
  errorCode?: 'DISABLED' | 'EVALUATOR_ERROR';
};
export type EvaluationInput = {
  original: File;
  result: GeneratedImage;
  generation: GenerationRecord;
  signal?: AbortSignal;
};
export interface GenerationEvaluatorPort {
  readonly version: string;
  readonly model: string;
  evaluate(input: EvaluationInput): Promise<EvaluationFinding[]>;
}
