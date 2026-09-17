import OpenAI from 'openai';
import type { ResponseInput } from 'openai/resources/responses/responses';

import type {
  CoachContext,
  CoachPort,
  CoachResult,
  CoachSuggestion,
} from '../../domain/life/coach';
import { CoachError } from '../../domain/life/coach';
import { coachInstructions } from './coach-prompt';

const TOOL_NAMES = ['get_persona', 'get_recent_records', 'get_today_progress'] as const;
const descriptions = [
  '사용자가 선택한 페르소나와 원하는 모습을 읽는다.',
  '최근 기록 최대 10개와 피드백, 최근 제안 최대 5회의 선택·실천 결과를 읽는다.',
  '오늘 날짜와 이미 보상을 받은 실천 종류를 읽는다.',
];
const suggestionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: { type: 'string', enum: ['outfit', 'activity'] },
    title: { type: 'string' },
    description: { type: 'string' },
    reason: { type: 'string' },
    minutes: { type: 'integer', minimum: 5, maximum: 30 },
  },
  required: ['category', 'title', 'description', 'reason', 'minutes'],
};
const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    encouragement: { type: 'string' },
    suggestions: { type: 'array', minItems: 2, maxItems: 2, items: suggestionSchema },
  },
  required: ['encouragement', 'suggestions'],
};

function shortText(value: unknown, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new CoachError('AI 제안 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.');
  }
  return value.trim();
}

export function parseCoachReply(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new CoachError('AI 제안을 읽지 못했습니다.');
  }
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.suggestions) || data.suggestions.length !== 2) {
    throw new CoachError('AI 제안 개수가 올바르지 않습니다.');
  }
  const suggestions: CoachSuggestion[] = data.suggestions.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') {
      throw new CoachError('AI 제안 형식이 올바르지 않습니다.');
    }
    const item = raw as Record<string, unknown>;
    if (
      (item.category !== 'outfit' && item.category !== 'activity') ||
      typeof item.minutes !== 'number' ||
      !Number.isInteger(item.minutes) ||
      item.minutes < 5 ||
      item.minutes > 30
    ) {
      throw new CoachError('AI 제안의 종류 또는 시간이 올바르지 않습니다.');
    }
    return {
      category: item.category,
      title: shortText(item.title, 100),
      description: shortText(item.description, 400),
      reason: shortText(item.reason, 300),
      minutes: item.minutes,
    };
  });
  if (new Set(suggestions.map((item) => item.category)).size !== 2) {
    throw new CoachError('코디와 활동 제안이 각각 필요합니다.');
  }
  return { encouragement: shortText(data.encouragement, 200), suggestions };
}

export class OpenAILifeCoach implements CoachPort {
  readonly model: string;
  constructor(
    private readonly options: { apiKey?: string; model?: string; timeoutMs?: number } = {},
  ) {
    this.model = options.model || process.env.COACH_MODEL || 'gpt-4.1-mini';
  }

  async generate(context: CoachContext, signal?: AbortSignal): Promise<CoachResult> {
    const client = new OpenAI({
      apiKey: this.options.apiKey || process.env.OPENAI_API_KEY,
      maxRetries: 0,
    });
    const timeout = AbortSignal.timeout(this.options.timeoutMs ?? 45000);
    const abort = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const toolsUsed: string[] = [];
    const input: ResponseInput = [
      {
        role: 'user',
        content: '내가 원하는 모습과 최근 경험에 맞춰 오늘 해볼 코디 하나와 활동 하나를 제안해 줘.',
      },
    ];
    try {
      for (let step = 0; step < 4; step += 1) {
        const response = await client.responses.create(
          {
            model: this.model,
            store: false,
            max_output_tokens: 1600,
            instructions: coachInstructions(context),
            input,
            tools: TOOL_NAMES.map((name, index) => ({
              type: 'function' as const,
              name,
              description: descriptions[index],
              strict: true,
              parameters: {
                type: 'object',
                properties: {},
                required: [],
                additionalProperties: false,
              },
            })),
            parallel_tool_calls: false,
            tool_choice: step === 3 ? 'none' : step === 0 ? 'required' : 'auto',
            text: {
              format: { type: 'json_schema', name: 'life_suggestions', strict: true, schema },
            },
          },
          { signal: abort },
        );
        if (response.status !== 'completed') {
          throw new CoachError('AI 응답이 완료되지 않았습니다. 다시 시도해 주세요.');
        }
        const calls = response.output.filter((item) => item.type === 'function_call');
        if (!calls.length) {
          if (!toolsUsed.includes('get_persona') || !toolsUsed.includes('get_recent_records')) {
            throw new CoachError('AI가 필요한 기록을 확인하지 못했습니다. 다시 시도해 주세요.');
          }
          const text =
            response.output_text ||
            response.output
              .flatMap((item) => (item.type === 'message' ? item.content : []))
              .filter((item) => item.type === 'output_text')
              .map((item) => item.text)
              .join('');
          return {
            ...parseCoachReply(JSON.parse(text)),
            source: 'ai',
            model: this.model,
            toolsUsed,
            createdAt: new Date().toISOString(),
          };
        }
        if (step === 3 || calls.length > 3 || toolsUsed.length + calls.length > 6) {
          throw new CoachError('AI 도구 호출 한도에 도달했습니다.');
        }
        for (const item of response.output) {
          if (
            item.type !== 'function_call' &&
            item.type !== 'message' &&
            item.type !== 'reasoning'
          ) {
            throw new CoachError('지원하지 않는 AI 응답 형식입니다.');
          }
          input.push(item);
        }
        for (const call of calls) {
          const args: unknown = JSON.parse(call.arguments);
          if (
            !TOOL_NAMES.some((name) => name === call.name) ||
            !args ||
            typeof args !== 'object' ||
            Array.isArray(args) ||
            Object.keys(args).length !== 0
          ) {
            throw new CoachError('허용되지 않은 AI 도구 요청입니다.');
          }
          const observation =
            call.name === 'get_persona'
              ? context.persona
              : call.name === 'get_recent_records'
                ? {
                    records: context.records,
                    previousSuggestions: context.previousSuggestions ?? [],
                  }
                : context.rewards;
          toolsUsed.push(call.name);
          input.push({
            type: 'function_call_output',
            call_id: call.call_id,
            output: JSON.stringify(observation),
          });
        }
      }
      throw new CoachError('AI 제안 반복 한도에 도달했습니다.');
    } catch (error) {
      if (error instanceof CoachError) {
        throw error;
      }
      if (abort.aborted) {
        throw new CoachError('AI 응답 대기 시간이 초과되었거나 요청이 취소되었습니다.');
      }
      if (error instanceof OpenAI.APIError && (error.status === 401 || error.status === 403)) {
        throw new CoachError('서버의 API 키와 모델 접근 권한을 확인해 주세요.');
      }
      if (error instanceof OpenAI.APIError && error.status === 429) {
        throw new CoachError('AI 서비스의 사용 한도 또는 결제 상태를 확인해 주세요.', 429);
      }
      throw new CoachError('AI 제안을 만들지 못했습니다. 모델 설정과 연결 상태를 확인해 주세요.');
    }
  }
}
