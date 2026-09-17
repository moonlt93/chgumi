'use client';

import { useRouter } from 'next/navigation';

import type { Occasion, Vibe } from '@/domain/styling/model';
import type { RefinementReason } from '@/domain/styling/preferences';

import { useStylingStore } from './styling-store';

export function useStylingFlow() {
  const router = useRouter();
  const store = useStylingStore();

  return {
    ...store,
    selectPhoto: (image: File) => store.setImage(image),
    nextFromPhoto: () => store.image && router.push('/occasion'),
    selectOccasion: (occasion: Occasion) => {
      store.chooseOccasion(occasion);
      router.push('/vibe');
    },
    selectVibe: (vibe: Vibe) => {
      store.chooseVibe(vibe);
      router.push('/generating');
    },
    refineResult: (reason: RefinementReason) => {
      if (!store.generationId) {
        return;
      }

      store.refine(reason);
      router.push('/generating');
    },
    retry: () => {
      store.setError(null);
      router.replace('/generating');
    },
    changeVibe: () => {
      store.clearResult();
      router.push('/vibe');
    },
    restart: () => {
      store.reset();
      router.replace('/photo');
    },
    download: () => {
      if (!store.resultUrl) {
        return;
      }

      const downloadLink = document.createElement('a');

      downloadLink.href = store.resultUrl;
      downloadLink.download = `chugumi-${store.occasion}-${store.vibe}.png`;
      downloadLink.click();
    },
  };
}
