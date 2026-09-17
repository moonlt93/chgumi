import type { Occasion, StylingSelection, Vibe } from '@/domain/styling/model';
import type { StylingPromptPort } from '@/domain/styling/ports';

const occasion: Record<Occasion, string> = {
  WORK: 'a professional office workday',
  DATE: 'a first date',
  WALK: 'a relaxed city walk',
  WORKOUT: 'a stylish workout',
};
const vibe: Record<Vibe, string> = {
  MINIMAL: 'minimal, clean, neutral and restrained',
  DANDY: 'modern Korean dandy, refined smart casual',
  CITY_BOY: 'relaxed Korean city-boy, oversized and contemporary',
  CASUAL: 'effortless casual, approachable and comfortable',
  SPORTY: 'modern sporty athleisure',
  GORPCORE: 'functional urban gorpcore outdoor',
};

export class ProductionPrompt implements StylingPromptPort {
  build(selection: StylingSelection) {
    return [
      `Edit the provided photo for ${occasion[selection.occasion]}.`,
      `Target aesthetic: ${vibe[selection.vibe]}.`,
      'Preserve the exact same identity, facial features, hairstyle, skin tone, body shape, body proportions, pose, camera angle, crop, lighting and background.',
      'Only change clothing, shoes and subtle fashion accessories. Do not beautify, age, reshape or replace the person.',
      'The outfit must be coherent, practical, wearable and photorealistic.',
    ].join('\n\n');
  }
}
