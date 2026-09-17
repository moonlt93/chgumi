import type { PromptVariant } from '@/domain/learning/model';
import type { Occasion, StylingSelection, Vibe } from '@/domain/styling/model';
import type { AdaptiveStylingPromptPort } from '@/domain/styling/ports';
import {
  defaultPreferences,
  type RefinementReason,
  type StylingPreferences,
} from '@/domain/styling/preferences';

export const PROMPT_VERSION = 'adaptive-v2';
const occasion: Record<Occasion, string> = {
  WORK: 'a professional office workday',
  DATE: 'a first date',
  WALK: 'a relaxed city walk',
  WORKOUT: 'a functional workout',
};
const vibe: Record<Vibe, string> = {
  MINIMAL: 'minimal, clean and neutral',
  DANDY: 'modern Korean dandy, refined smart casual',
  CITY_BOY: 'relaxed Korean city-boy, contemporary layering',
  CASUAL: 'effortless comfortable casual',
  SPORTY: 'modern sporty athleisure',
  GORPCORE: 'functional urban gorpcore outdoor',
};
const corrections: Record<RefinementReason, string> = {
  LESS_FLASHY: 'Use muted colors, simple patterns and fewer accessories.',
  LESS_FORMAL:
    'Reduce formality with casual fabrics and approachable everyday pieces, while still fitting the occasion.',
  SLIMMER_FIT: 'Use a neat regular fit instead of oversized garments; never reshape the body.',
  RELAXED_FIT: 'Use comfortable relaxed fit garments; never reshape the body.',
  PRESERVE_IDENTITY:
    'Identity preservation is critical: retain the original face and body exactly. Limit all edits to garments.',
};

export function buildAdaptivePrompt(
  selection: StylingSelection,
  variant: PromptVariant,
  preferences: StylingPreferences = defaultPreferences(),
  refinements: RefinementReason[] = [],
) {
  const common = [
    `Edit the provided ORIGINAL photo for ${occasion[selection.occasion]}.`,
    `Target aesthetic: ${vibe[selection.vibe]}.`,
  ];
  const preserve =
    'Preserve the exact same identity, facial features, hairstyle, skin tone, body shape, proportions, pose, camera angle, crop, lighting and background. Do not beautify, age, reshape or replace the person.';
  const style =
    'Only change clothing, shoes and subtle fashion accessories. Create a coherent, practical, wearable, photorealistic outfit with intentional fit and layering.';
  const constraints = [
    preferences.change === 'SUBTLE'
      ? 'Make a subtle, approachable everyday styling change.'
      : 'Make a clearly noticeable fashion change while keeping the person unchanged.',
    ...preferences.avoid.map(
      (value) =>
        ({
          OVERSIZED: 'Avoid oversized fits.',
          BOLD_COLORS: 'Avoid bright colors and loud patterns.',
          ACCESSORIES: 'Avoid added accessories.',
        })[value],
    ),
  ];

  return [
    ...common,
    ...(variant === 'STYLE_FIRST' ? [style, preserve] : [preserve, style]),
    variant === 'CONTROL'
      ? 'Keep styling simple.'
      : 'Pay special attention to the priorities above.',
    'User constraints override aesthetic defaults. Refinements override conflicting fit constraints only.',
    ...constraints,
    ...refinements.map((reason) => corrections[reason]),
  ].join('\n\n');
}

export class AdaptiveStylingPrompt implements AdaptiveStylingPromptPort {
  readonly version = PROMPT_VERSION;

  build = buildAdaptivePrompt;
}
