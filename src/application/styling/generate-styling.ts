import { createHash, randomUUID } from 'node:crypto';

import { EvaluateGeneration } from '@/application/evaluation/evaluate-generation';
import type { GenerationRecord } from '@/domain/learning/model';
import type { ExperimentRepositoryPort, VariantPolicyPort } from '@/domain/learning/ports';
import { InvalidStylingRequestError } from '@/domain/styling/errors';
import type { AdaptiveStylingPromptPort, ImageGenerationPort } from '@/domain/styling/ports';
import { addRefinement } from '@/domain/styling/preferences';

import type { parseGenerateRequest } from './parse-generate-request';

export class GenerateStyling {
  constructor(
    private imageGenerator: ImageGenerationPort,
    private experiments: ExperimentRepositoryPort,
    private policy: VariantPolicyPort,
    private prompt: AdaptiveStylingPromptPort,
    private evaluation = new EvaluateGeneration(experiments),
  ) {}

  async execute(
    input: ReturnType<typeof parseGenerateRequest> & { sessionId: string; signal?: AbortSignal },
  ) {
    const sourceHash = createHash('sha256')
      .update(new Uint8Array(await input.image.arrayBuffer()))
      .digest('hex');
    const parent = input.parentGenerationId
      ? await this.experiments.getGeneration(input.parentGenerationId)
      : null;

    if (
      input.parentGenerationId &&
      (!parent ||
        parent.sessionId !== input.sessionId ||
        parent.status !== 'SUCCEEDED' ||
        parent.sourceHash !== sourceHash ||
        parent.context.occasion !== input.selection.occasion ||
        parent.context.vibe !== input.selection.vibe)
    ) {
      throw new InvalidStylingRequestError('원본 사진과 기존 결과를 확인해 주세요.');
    }

    const preferences = parent?.preferences ?? input.preferences;
    const refinements =
      parent && input.refinementReason
        ? addRefinement(parent.refinements, input.refinementReason)
        : [];
    const variant =
      parent?.variant ??
      this.policy.choose(input.selection, await this.experiments.stats(input.selection));
    const record: GenerationRecord = {
      id: randomUUID(),
      sessionId: input.sessionId,
      sourceHash,
      context: input.selection,
      variant,
      promptVersion: this.prompt.version,
      preferences,
      refinements,
      parentGenerationId: parent?.id,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    await this.experiments.saveGeneration(record);

    const started = Date.now();

    let image;

    try {
      image = await this.imageGenerator.edit({
        image: input.image,
        prompt: this.prompt.build(input.selection, variant, preferences, refinements),
        filename: input.image.name,
        mimeType: input.image.type,
        signal: input.signal,
      });
    } catch (error) {
      await this.experiments.saveGeneration({
        ...record,
        status: 'FAILED',
        durationMs: Date.now() - started,
      });

      throw error;
    }

    const completed: GenerationRecord = {
      ...record,
      status: 'SUCCEEDED',
      durationMs: Date.now() - started,
    };
    await this.experiments.saveGeneration(completed);

    let evaluationStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' = 'FAILED';
    try {
      evaluationStatus = await this.evaluation.execute({
        original: input.image,
        result: image,
        generation: completed,
        signal: input.signal,
      });
    } catch {
      // Evaluation persistence is independent of the successfully generated image.
      console.error('Evaluation record could not be saved', record.id);
    }

    return { image, generationId: record.id, variant, evaluationStatus };
  }
}
