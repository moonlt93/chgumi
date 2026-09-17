export interface CoachSuggestion {
  category: 'outfit' | 'activity';
  title: string;
  description: string;
  reason: string;
  minutes: number;
}

export interface CoachResult {
  encouragement: string;
  suggestions: CoachSuggestion[];
  source: 'ai';
  model: string;
  createdAt: string;
  toolsUsed: string[];
}

export interface CoachContext {
  persona: { name: string; description: string; aspiration: string };
  records: { day: string; category: string; title: string; note: string; feeling: string }[];
  rewards: { day: string; completedCategories: string[] };
}

export interface CoachPort {
  readonly model: string;
  generate(context: CoachContext, signal?: AbortSignal): Promise<CoachResult>;
}

export class CoachError extends Error {
  constructor(
    message: string,
    readonly status = 503,
  ) {
    super(message);
  }
}
