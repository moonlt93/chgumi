import type { Occasion, Vibe } from '@/domain/styling/model';
import type { RefinementReason, StylingPreferences } from '@/domain/styling/preferences';

export const PROMPT_VARIANTS = ['CONTROL', 'PRESERVE_FIRST', 'STYLE_FIRST'] as const;

export type PromptVariant = (typeof PROMPT_VARIANTS)[number];

export const FEEDBACK_SIGNALS = ['DOWNLOAD', 'LIKE', 'DISLIKE', 'REPORT', 'COMPARE'] as const;

export type FeedbackSignal = (typeof FEEDBACK_SIGNALS)[number];

export type ExperimentContext = { occasion: Occasion; vibe: Vibe };

export type VariantStats = {
  variant: PromptVariant;
  impressions: number;
  failures: number;
  feedbackCount: number;
  rewards: number;
  rewardRate: number;
  positivePerGeneration: number | null;
};

export type GenerationRecord = {
  id: string;
  sessionId: string;
  sourceHash: string;
  context: ExperimentContext;
  variant: PromptVariant;
  promptVersion: string;
  preferences: StylingPreferences;
  refinements: RefinementReason[];
  parentGenerationId?: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  createdAt: string;
  durationMs?: number;
};

export const FEEDBACK_REASONS = [
  'IDENTITY_CHANGED',
  'BODY_CHANGED',
  'TOO_FLASHY',
  'TOO_FORMAL',
  'FIT_NOT_RIGHT',
  'OTHER',
] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];
export const COMPARISON_CHOICES = ['BETTER', 'SAME', 'WORSE'] as const;
export type ComparisonChoice = (typeof COMPARISON_CHOICES)[number];
export type FeedbackInput = {
  eventId: string;
  generationId: string;
  signal: FeedbackSignal;
  reason?: FeedbackReason;
  comparison?: ComparisonChoice;
};
export type StylingFeedback = FeedbackInput & {
  createdAt: string;
  sequence: number;
};
