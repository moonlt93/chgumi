import { EvaluateGeneration } from '@/application/evaluation/evaluate-generation';
import { RecordFeedback } from '@/application/learning/record-feedback';
import { GenerateStyling } from '@/application/styling/generate-styling';
import { AdaptiveStylingPrompt } from '@/infrastructure/ai/adaptive-prompt';
import { OpenAIImageGenerator } from '@/infrastructure/ai/openai-image-generator';
import { OpenAIStylingEvaluator } from '@/infrastructure/evaluation/openai-styling-evaluator';
import { EpsilonGreedyPolicy } from '@/infrastructure/learning/epsilon-greedy-policy';
import { FileExperimentRepository } from '@/infrastructure/learning/file-experiment-repository';

const experiments = new FileExperimentRepository();
const policy = new EpsilonGreedyPolicy();
export const stylingContainer = {
  generateStyling: new GenerateStyling(
    new OpenAIImageGenerator(),
    experiments,
    policy,
    new AdaptiveStylingPrompt(),
    new EvaluateGeneration(
      experiments,
      process.env.GENERATION_EVALUATION_ENABLED === 'false'
        ? undefined
        : new OpenAIStylingEvaluator(),
    ),
  ),
  recordFeedback: new RecordFeedback(experiments),
  experiments,
};
