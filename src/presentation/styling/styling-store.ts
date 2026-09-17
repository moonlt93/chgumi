'use client';

import { create } from 'zustand';

import type { Occasion, Vibe } from '@/domain/styling/model';
import {
  defaultPreferences,
  type RefinementReason,
  type StylingPreferences,
} from '@/domain/styling/preferences';

type State = {
  image: File | null;
  previewUrl: string | null;
  occasion: Occasion | null;
  vibe: Vibe | null;
  resultUrl: string | null;
  previousResultUrl: string | null;
  previousGenerationId: string | null;
  generationId: string | null;
  variant: string | null;
  error: string | null;
  preferences: StylingPreferences;
  parentGenerationId: string | null;
  refinementReason: RefinementReason | null;
  setImage: (image: File) => void;
  chooseOccasion: (occasion: Occasion) => void;
  chooseVibe: (vibe: Vibe) => void;
  setPreferences: (preferences: StylingPreferences) => void;
  refine: (reason: RefinementReason) => void;
  setResult: (blob: Blob, id: string, variant: string) => void;
  setError: (error: string | null) => void;
  clearResult: () => void;
  reset: () => void;
};

const revoke = (url: string | null) => {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};
const initial = () => ({
  image: null,
  previewUrl: null,
  occasion: null,
  vibe: null,
  resultUrl: null,
  previousResultUrl: null,
  previousGenerationId: null,
  generationId: null,
  variant: null,
  error: null,
  preferences: defaultPreferences(),
  parentGenerationId: null,
  refinementReason: null,
});
export const useStylingStore = create<State>((set, get) => ({
  ...initial(),
  setImage: (image) => {
    revoke(get().previousResultUrl);
    revoke(get().previewUrl);
    revoke(get().resultUrl);
    set({ ...initial(), image, previewUrl: URL.createObjectURL(image) });
  },
  chooseOccasion: (occasion) => set({ occasion, error: null }),
  chooseVibe: (vibe) =>
    set({ vibe, parentGenerationId: null, refinementReason: null, error: null }),
  setPreferences: (preferences) => set({ preferences }),
  refine: (refinementReason) =>
    set({ parentGenerationId: get().generationId, refinementReason, error: null }),
  setResult: (blob, generationId, variant) => {
    const current = get();
    revoke(current.previousResultUrl);
    const isRefinement =
      current.parentGenerationId === current.generationId && current.generationId !== null;
    if (!isRefinement) {
      revoke(current.resultUrl);
    }
    set({
      resultUrl: URL.createObjectURL(blob),
      generationId,
      variant,
      error: null,
      previousResultUrl: isRefinement ? current.resultUrl : null,
      previousGenerationId: isRefinement ? current.generationId : null,
    });
  },
  setError: (error) => set({ error }),
  clearResult: () => {
    revoke(get().previousResultUrl);
    revoke(get().resultUrl);
    set({
      resultUrl: null,
      previousResultUrl: null,
      previousGenerationId: null,
      generationId: null,
      variant: null,
      parentGenerationId: null,
      refinementReason: null,
      error: null,
    });
  },
  reset: () => {
    revoke(get().previousResultUrl);
    revoke(get().previewUrl);
    revoke(get().resultUrl);
    set(initial());
  },
}));
