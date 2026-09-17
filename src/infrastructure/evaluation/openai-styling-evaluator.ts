import OpenAI from 'openai';

import type { EvaluationInput, GenerationEvaluatorPort } from '@/domain/evaluation/model';

import {
  buildStylingJudgePrompt,
  EVALUATOR_VERSION,
  parseStylingFindings,
  stylingJudgeSchema,
} from './styling-judge';

export class OpenAIStylingEvaluator implements GenerationEvaluatorPort {
  readonly version = EVALUATOR_VERSION;
  readonly model: string;

  constructor(private options: { model?: string; apiKey?: string; timeoutMs?: number } = {}) {
    this.model = options.model ?? process.env.EVAL_MODEL ?? 'gpt-5.6-luna';
  }

  async evaluate(input: EvaluationInput) {
    const timeout = this.options.timeoutMs ?? 15000;
    const signal = input.signal
      ? AbortSignal.any([input.signal, AbortSignal.timeout(timeout)])
      : AbortSignal.timeout(timeout);
    const client = new OpenAI({
      apiKey: this.options.apiKey ?? process.env.OPENAI_API_KEY,
      maxRetries: 0,
    });
    const before = Buffer.from(await input.original.arrayBuffer()).toString('base64');
    const after = Buffer.from(input.result.bytes).toString('base64');
    const response = await client.responses.create(
      {
        model: this.model,
        store: false,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: buildStylingJudgePrompt(input) },
              { type: 'input_text', text: 'ORIGINAL:' },
              {
                type: 'input_image',
                image_url: `data:${input.original.type};base64,${before}`,
                detail: 'auto',
              },
              { type: 'input_text', text: 'GENERATED:' },
              {
                type: 'input_image',
                image_url: `data:${input.result.contentType};base64,${after}`,
                detail: 'auto',
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'styling_review',
            strict: true,
            schema: stylingJudgeSchema,
          },
        },
      },
      { signal },
    );
    const text =
      response.output_text ||
      response.output
        ?.flatMap((item) => (item.type === 'message' ? item.content : []))
        .filter((content) => content.type === 'output_text')
        .map((content) => content.text)
        .join('');

    if (response.status !== 'completed' || !text) {
      throw new Error('Evaluation not completed');
    }
    const decoded: unknown = JSON.parse(text);
    return parseStylingFindings(decoded);
  }
}
