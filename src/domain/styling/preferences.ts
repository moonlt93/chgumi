export const AVOID_OPTIONS = ['OVERSIZED', 'BOLD_COLORS', 'ACCESSORIES'] as const;
export const REFINEMENT_REASONS = [
  'LESS_FLASHY',
  'LESS_FORMAL',
  'SLIMMER_FIT',
  'RELAXED_FIT',
  'PRESERVE_IDENTITY',
] as const;

export type RefinementReason = (typeof REFINEMENT_REASONS)[number];

export type StylingPreferences = {
  change: 'SUBTLE' | 'BOLD';
  avoid: (typeof AVOID_OPTIONS)[number][];
};

export const defaultPreferences = (): StylingPreferences => ({ change: 'SUBTLE', avoid: [] });
export const refinementLabels: Record<RefinementReason, string> = {
  LESS_FLASHY: '덜 화려하게',
  LESS_FORMAL: '덜 격식 있게',
  SLIMMER_FIT: '핏을 더 단정하게',
  RELAXED_FIT: '핏을 더 여유롭게',
  PRESERVE_IDENTITY: '얼굴·체형을 더 유지해 주세요',
};

export function addRefinement(
  reasons: RefinementReason[],
  next: RefinementReason,
): RefinementReason[] {
  const opposite =
    next === 'SLIMMER_FIT' ? 'RELAXED_FIT' : next === 'RELAXED_FIT' ? 'SLIMMER_FIT' : undefined;

  return [...reasons.filter((r) => r !== next && r !== opposite), next];
}
