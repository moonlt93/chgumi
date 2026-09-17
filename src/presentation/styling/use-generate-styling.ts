'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useStylingStore } from './styling-store';

export function useGenerateStyling() {
  const router = useRouter();
  const preferences = useStylingStore((state) => state.preferences);
  const parentGenerationId = useStylingStore((state) => state.parentGenerationId);
  const refinementReason = useStylingStore((state) => state.refinementReason);
  const image = useStylingStore((state) => state.image);
  const occasion = useStylingStore((state) => state.occasion);
  const vibe = useStylingStore((state) => state.vibe);
  const setResult = useStylingStore((state) => state.setResult);
  const setError = useStylingStore((state) => state.setError);

  return useCallback(
    async (signal?: AbortSignal) => {
      if (!image || !occasion || !vibe) {
        router.replace('/photo');

        return;
      }

      const formData = new FormData();

      formData.append('image', image);
      formData.append('occasion', occasion);
      formData.append('vibe', vibe);
      formData.append('preferences', JSON.stringify(preferences));

      if (parentGenerationId && refinementReason) {
        formData.append('parentGenerationId', parentGenerationId);
        formData.append('refinementReason', refinementReason);
      }

      try {
        const response = await fetch('/api/generate', { method: 'POST', body: formData, signal });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));

          throw new Error(body.message || '이미지 생성에 실패했습니다.');
        }

        const generationId = response.headers.get('X-Generation-Id');
        const variant = response.headers.get('X-Prompt-Variant');
        if (!generationId || !variant) {
          throw new Error('결과 식별자가 없습니다. 다시 생성해 주세요.');
        }
        setResult(await response.blob(), generationId, variant);
        router.replace('/result');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setError(error instanceof Error ? error.message : '이미지 생성에 실패했습니다.');
      }
    },
    [
      image,
      occasion,
      vibe,
      preferences,
      parentGenerationId,
      refinementReason,
      router,
      setResult,
      setError,
    ],
  );
}
