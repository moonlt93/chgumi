import type { Occasion, Vibe } from '@/domain/styling/model';

export type PromptVariant = 'CONTROL' | 'PRESERVE_FIRST' | 'STYLE_FIRST';
export type FeedbackSignal = 'DOWNLOAD' | 'REGENERATE' | 'LIKE' | 'DISLIKE';

export type ExperimentContext = { occasion: Occasion; vibe: Vibe };
export type VariantStats = { variant: PromptVariant; impressions: number; rewards: number; rewardRate: number };
export type StylingFeedback = {
  generationId: string; variant: PromptVariant; context: ExperimentContext;
  signal: FeedbackSignal; reward: number; createdAt: string;
};
