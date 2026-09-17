'use client';

import { useRef, useState } from 'react';

import type { ReviewItem } from '@/application/review/list-reviews';
import {
  comparisonLabels,
  feedbackReasonLabels,
  feedbackSignalLabels,
} from '@/domain/learning/feedback-labels';
import { Screen } from '@/presentation/ui/Screen';

const criterionLabels = {
  identity: '인물 보존',
  body: '체형·자세 보존',
  constraints: '요청 조건',
  styling: '스타일 적합성',
};
const verdictLabels = { pass: '통과', fail: '실패', uncertain: '판단 어려움' };
const statusLabels = {
  PENDING: '평가 중',
  COMPLETED: '평가 완료',
  FAILED: '평가 실패',
  SKIPPED: '평가 비활성',
};

export default function ReviewPage() {
  const tokenInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function load(pageOffset: number) {
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/review?offset=${pageOffset}`, {
        headers: { Authorization: `Bearer ${tokenInput.current?.value ?? ''}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? '접근 키가 없거나 올바르지 않습니다.'
            : '기록을 읽지 못했습니다.',
        );
      }
      const body = (await response.json()) as { items: ReviewItem[]; total: number };
      setItems(body.items);
      setTotal(body.total);
      setOffset(pageOffset);
      setLoaded(true);
    } catch (cause) {
      setItems([]);
      setLoaded(false);
      setError(cause instanceof Error ? cause.message : '기록을 읽지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <h1 className="mt-5 text-2xl font-bold">품질 검토</h1>
      <p className="mt-3 text-sm text-zinc-600">
        생성 평가와 사용자 의견을 함께 확인합니다. 이미지는 보관하지 않으며, 불일치 표시는 검토
        후보를 뜻합니다.
      </p>
      <form
        className="my-6 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void load(0);
        }}
      >
        <label className="block text-sm font-bold">
          검토 접근 키
          <input
            ref={tokenInput}
            type="password"
            autoComplete="off"
            required
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <button
          disabled={pending}
          className="w-full rounded-xl bg-zinc-900 p-3 text-white disabled:opacity-40"
        >
          {pending ? '조회 중' : '기록 조회 / 새로고침'}
        </button>
      </form>
      {error && (
        <p role="alert" className="mb-4 text-red-700">
          {error}
        </p>
      )}
      {loaded && (
        <p role="status" className="mb-4 text-sm">
          전체 {total}건 · 현재 페이지 {items.length}건
        </p>
      )}
      {loaded && items.length === 0 && <p>생성 기록이 없습니다.</p>}
      <div className="space-y-5">
        {items.map((item) => (
          <article key={item.generation.id} className="rounded-2xl border border-zinc-200 p-4">
            <h2 className="font-bold">
              {item.generation.context.occasion} · {item.generation.context.vibe}
            </h2>
            <p className="mt-2 break-all text-xs text-zinc-500">{item.generation.id}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {item.generation.createdAt} · {item.generation.promptVersion} ·{' '}
              {item.generation.variant}
            </p>
            <p className="mt-2 text-sm">
              생성 {item.generation.status} · {item.generation.durationMs ?? 0}ms
            </p>
            {item.generation.parentGenerationId && (
              <p className="mt-1 break-all text-xs">
                이전 결과: {item.generation.parentGenerationId}
              </p>
            )}
            <p className="mt-2 text-sm">
              평가: {item.evaluation ? statusLabels[item.evaluation.status] : '기록 없음'}
            </p>
            {item.evaluation && (
              <p className="text-xs text-zinc-500">
                {item.evaluation.model} · {item.evaluation.evaluatorVersion} ·{' '}
                {item.evaluation.durationMs}ms
              </p>
            )}
            {item.disagreements.length > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                모델은 통과로 판단했지만 사용자가 보존 문제를 신고했습니다. 재검토가 필요합니다.
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {item.evaluation?.findings.map((finding) => (
                <li key={finding.criterion} className="text-sm">
                  <strong>
                    {criterionLabels[finding.criterion]}: {verdictLabels[finding.verdict]}
                  </strong>
                  <p className="mt-1 text-zinc-600">{finding.reason}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              현재 의견:{' '}
              {item.latestVote ? feedbackSignalLabels[item.latestVote.signal] : '응답 없음'}
            </p>
            <p className="mt-1 text-sm">
              수정 비교:{' '}
              {item.latestComparison?.comparison
                ? comparisonLabels[item.latestComparison.comparison]
                : '응답 없음'}
            </p>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer">피드백 이력 {item.events.length}건</summary>
              <ol className="mt-2 space-y-2">
                {item.events.map((event) => (
                  <li key={event.eventId}>
                    #{event.sequence} {feedbackSignalLabels[event.signal]}{' '}
                    {event.reason ? `· ${feedbackReasonLabels[event.reason]}` : ''}{' '}
                    {event.comparison ? `· ${comparisonLabels[event.comparison]}` : ''}
                    <span className="block text-xs text-zinc-500">{event.createdAt}</span>
                  </li>
                ))}
              </ol>
            </details>
          </article>
        ))}
      </div>
      {loaded && (
        <nav className="mt-6 flex gap-3" aria-label="검토 페이지">
          <button
            disabled={pending || offset === 0}
            onClick={() => load(Math.max(0, offset - 20))}
            className="rounded-xl border p-3 disabled:opacity-30"
          >
            이전
          </button>
          <button
            disabled={pending || offset + items.length >= total}
            onClick={() => load(offset + 20)}
            className="rounded-xl border p-3 disabled:opacity-30"
          >
            다음
          </button>
        </nav>
      )}
    </Screen>
  );
}
