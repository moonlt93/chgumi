export const OCCASIONS = ['WORK', 'DATE', 'WALK', 'WORKOUT'] as const;
export const VIBES = ['MINIMAL', 'DANDY', 'CITY_BOY', 'CASUAL', 'SPORTY', 'GORPCORE'] as const;
export type Occasion = typeof OCCASIONS[number];
export type Vibe = typeof VIBES[number];

export type StylingSelection = Readonly<{ occasion: Occasion; vibe: Vibe }>;
export type GeneratedImage = Readonly<{ bytes: Uint8Array; contentType: string }>;

export const isOccasion = (value: unknown): value is Occasion =>
  typeof value === 'string' && (OCCASIONS as readonly string[]).includes(value);
export const isVibe = (value: unknown): value is Vibe =>
  typeof value === 'string' && (VIBES as readonly string[]).includes(value);
