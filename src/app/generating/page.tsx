'use client';

import { useEffect } from 'react';

import { useGenerateStyling } from '@/presentation/styling/use-generate-styling';
import { useStylingFlow } from '@/presentation/styling/use-styling-flow';
import { PrimaryButton } from '@/presentation/ui/PrimaryButton';
import { Screen } from '@/presentation/ui/Screen';

export default function Generating() {
  const generate = useGenerateStyling();
  const { error, retry, changeVibe } = useStylingFlow();

  useEffect(() => {
    if (error) {
      return;
    }

    const abortController = new AbortController();
    void generate(abortController.signal);

    return () => abortController.abort();
  }, [generate, error]);

  return (
    <Screen className="flex flex-col items-center justify-center text-center">
      {!error && <div className="h-20 w-20 animate-pulse rounded-full bg-zinc-950" />}
      <h1 className="mt-8 text-2xl font-black">
        {error ? '코디를 만들지 못했어요' : '코디를 만들고 있어요'}
      </h1>
      {error ? (
        <div className="mt-5 w-full">
          <p role="alert" className="mb-4 text-sm text-red-600">
            {error}
          </p>
          <PrimaryButton onClick={retry}>다시 시도</PrimaryButton>
          <button onClick={changeVibe} className="mt-3 w-full py-3 text-sm text-zinc-500">
            추구미 다시 선택
          </button>
        </div>
      ) : (
        <p role="status" className="mt-4 text-zinc-500">
          완성되면 결과 화면으로 이동해요.
        </p>
      )}
    </Screen>
  );
}
