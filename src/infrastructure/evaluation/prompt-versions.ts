import { PROMPT_VARIANTS, type PromptVariant } from '@/domain/learning/model';
import type { Occasion, Vibe } from '@/domain/styling/model';

import { buildAdaptivePrompt } from '../ai/adaptive-prompt';

export type PromptVersion = 'P0' | 'P1' | 'P2' | 'P3' | PromptVariant;

const occasionText: Record<Occasion, string> = {
  WORK: 'a modern office workday; professional but not overly formal',
  DATE: 'a first date; attractive, approachable and polished',
  WALK: 'a relaxed city walk; comfortable and effortless',
  WORKOUT: 'a workout; functional, athletic and clean',
};
const vibeText: Record<Vibe, string> = {
  MINIMAL: 'minimal fashion: clean silhouette, neutral colors, restrained accessories',
  DANDY:
    'modern Korean dandy: refined smart casual, relaxed tailoring, sophisticated and understated',
  CITY_BOY: 'Korean city-boy: relaxed oversized silhouette, contemporary layering and muted colors',
  CASUAL: 'effortless casual: approachable, comfortable, coherent everyday styling',
  SPORTY: 'modern sporty athleisure: functional, streamlined and clean',
  GORPCORE:
    'urban gorpcore: technical outdoor clothing, functional layering and restrained utility details',
};

export function buildVersionedPrompt(version: PromptVersion, occasion: Occasion, vibe: Vibe) {
  if (PROMPT_VARIANTS.includes(version as PromptVariant)) {
    return buildAdaptivePrompt({ occasion, vibe }, version as PromptVariant);
  }

  if (!['P0', 'P1', 'P2', 'P3'].includes(version)) {
    throw new Error('Unknown prompt version');
  }

  const base = `Edit the provided photo. Change the person's clothing to ${vibeText[vibe]}. Keep the result photorealistic and wearable.`;

  if (version === 'P0') {
    return base;
  }

  const identity = `Preserve the exact same person's identity, facial features, hairstyle and skin tone. Do not beautify, age, reshape or replace the person.`;

  if (version === 'P1') {
    return `${base}\n\n${identity}`;
  }

  const structure = `Preserve body shape and proportions, pose, hand position, camera angle, crop, lighting and background. Only clothing, shoes and subtle fashion accessories may change.`;

  if (version === 'P2') {
    return `${base}\n\n${identity}\n\n${structure}`;
  }

  const context = `Occasion: ${occasionText[occasion]}. The styling must clearly fit this occasion while remaining consistent with the target vibe. Avoid costume-like, editorial-only or impractical outfits.`;

  return `${base}\n\n${identity}\n\n${structure}\n\n${context}`;
}
