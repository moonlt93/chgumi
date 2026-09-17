'use client';

import { useState } from 'react';

import { comparisonLabels, feedbackReasonLabels } from '@/domain/learning/feedback-labels';
import { COMPARISON_CHOICES, type FeedbackReason } from '@/domain/learning/model';

import type { useFeedback } from '../use-feedback';

export function FeedbackControls({
  feedback,
  canCompare,
}: {
  feedback: ReturnType<typeof useFeedback>;
  canCompare: boolean;
}) {
  const [reason, setReason] = useState<FeedbackReason | ''>('');
  return (
    <section className="mt-6 space-y-5" aria-label="코디 의견">
      <div>
        <h2 className="font-bold">이 코디를 입고 싶나요?</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            disabled={feedback.pending}
            aria-pressed={feedback.latestVote?.signal === 'LIKE'}
            onClick={() => feedback.send('LIKE')}
            className="rounded-2xl bg-zinc-100 py-3 font-bold aria-pressed:bg-zinc-900 aria-pressed:text-white disabled:opacity-40"
          >
            입고 싶어요
          </button>
          <button
            disabled={feedback.pending}
            aria-pressed={feedback.latestVote?.signal === 'DISLIKE'}
            onClick={() => feedback.send('DISLIKE', reason ? { reason } : {})}
            className="rounded-2xl bg-zinc-100 py-3 font-bold aria-pressed:bg-zinc-900 aria-pressed:text-white disabled:opacity-40"
          >
            아쉬워요
          </button>
        </div>
        <label className="mt-3 block text-sm">
          아쉬운 이유 (선택)
          <select
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white p-3"
            value={reason}
            onChange={(event) => setReason(event.target.value as FeedbackReason | '')}
          >
            <option value="">이유 선택</option>
            {(['TOO_FLASHY', 'TOO_FORMAL', 'FIT_NOT_RIGHT', 'OTHER'] as const).map((value) => (
              <option key={value} value={value}>
                {feedbackReasonLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-zinc-500">
          이유를 선택하고 ‘아쉬워요’를 누르면 함께 저장해요. 의견은 다시 선택해 변경할 수 있어요.
        </p>
      </div>
      <div>
        <h2 className="font-bold">내 모습이 달라졌나요?</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['IDENTITY_CHANGED', 'BODY_CHANGED'] as const).map((value) => (
            <button
              key={value}
              disabled={feedback.pending}
              onClick={() => feedback.send('REPORT', { reason: value })}
              className="rounded-full border border-zinc-200 px-4 py-3 text-sm disabled:opacity-40"
            >
              {feedbackReasonLabels[value]}
            </button>
          ))}
        </div>
      </div>
      {canCompare && (
        <div>
          <h2 className="font-bold">수정 전과 비교하면 어떤가요?</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {COMPARISON_CHOICES.map((comparison) => (
              <button
                key={comparison}
                disabled={feedback.pending}
                aria-pressed={feedback.latestComparison?.comparison === comparison}
                onClick={() => feedback.send('COMPARE', { comparison })}
                className="rounded-full border border-zinc-200 px-4 py-3 text-sm aria-pressed:bg-zinc-900 aria-pressed:text-white disabled:opacity-40"
              >
                {comparisonLabels[comparison]}
              </button>
            ))}
          </div>
        </div>
      )}
      <p role="status" className="min-h-5 text-sm text-zinc-500">
        {feedback.message}
      </p>
    </section>
  );
}
