'use client';

import { occasionCatalog, vibeCatalog } from '@/domain/styling/catalog';
import { REFINEMENT_REASONS, refinementLabels } from '@/domain/styling/preferences';
import { FeedbackControls } from '@/presentation/styling/components/FeedbackControls';
import { ImageComparison } from '@/presentation/styling/components/ImageComparison';
import { useFeedback } from '@/presentation/styling/use-feedback';
import { useStylingFlow } from '@/presentation/styling/use-styling-flow';
import { PrimaryButton } from '@/presentation/ui/PrimaryButton';
import { Screen } from '@/presentation/ui/Screen';

export default function Result() {
  const {
    occasion,
    vibe,
    previewUrl,
    resultUrl,
    previousResultUrl,
    download,
    changeVibe,
    restart,
    refineResult,
  } = useStylingFlow();
  const feedback = useFeedback();

  if (!resultUrl || !previewUrl) {
    return (
      <Screen>
        <h1 className="mt-12 text-2xl font-bold">사진으로 코디를 만들어 보세요.</h1>
        <p className="my-5 text-zinc-500">
          새로고침하면 사진이 초기화돼요. 사진을 다시 선택해 주세요.
        </p>
        <PrimaryButton onClick={restart}>사진 선택하기</PrimaryButton>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="text-sm font-bold">
        {occasionCatalog.find((option) => option.id === occasion)?.title} ·{' '}
        {vibeCatalog.find((option) => option.id === vibe)?.name}
      </div>
      <h1 className="mt-3 text-3xl font-black">입고 싶은 나를 찾아요.</h1>
      <ImageComparison before={previewUrl} after={resultUrl} />
      {previousResultUrl && (
        <section className="mt-6">
          <h2 className="font-bold">수정 전후 비교</h2>
          <ImageComparison
            before={previousResultUrl}
            after={resultUrl}
            beforeLabel="수정 전"
            afterLabel="수정 후"
          />
        </section>
      )}
      <section className="mt-6">
        <h2 className="font-bold">어떤 부분을 바꾸고 싶나요?</h2>
        <p className="mt-1 text-sm text-zinc-500">
          원본 사진에 지금까지의 수정 조건을 반영해 다시 만들어요.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {REFINEMENT_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => refineResult(reason)}
              className="rounded-full border border-zinc-200 px-4 py-3 text-sm"
            >
              {refinementLabels[reason]}
            </button>
          ))}
        </div>
      </section>
      <FeedbackControls feedback={feedback} canCompare={Boolean(previousResultUrl)} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={changeVibe} className="rounded-2xl bg-zinc-100 py-4 font-bold">
          다른 추구미 보기
        </button>
        <PrimaryButton
          onClick={() => {
            download();
            void feedback.send('DOWNLOAD');
          }}
        >
          사진 저장
        </PrimaryButton>
      </div>
      <button onClick={restart} className="mt-3 w-full py-3 text-sm text-zinc-500">
        새 사진으로 시작
      </button>
    </Screen>
  );
}
