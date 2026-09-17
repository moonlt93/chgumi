'use client';

import { useEffect, useRef, useState } from 'react';

import type { Category } from '@/domain/life/catalog';
import type { CoachResult } from '@/domain/life/coach';

const toolLabels: Record<string, string> = {
  get_persona: '원하는 모습 확인',
  get_recent_records: '최근 기록과 느낌 확인',
  get_today_progress: '오늘 실천 현황 확인',
};

export function CoachPanel({
  available,
  onRecord,
}: {
  available: boolean;
  onRecord: (category: Category, title: string) => void;
}) {
  const [result, setResult] = useState<CoachResult | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/coach', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('저장된 AI 제안을 불러오지 못했어요.');
        }
        return response.json() as Promise<{ result: CoachResult | null }>;
      })
      .then((payload) => setResult(payload.result))
      .catch((failure: Error) => {
        if (!controller.signal.aborted) {
          setError(failure.message);
        }
      });
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, []);

  async function generate() {
    if (request.current) {
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/coach', { method: 'POST', signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || 'AI 제안을 만들지 못했어요.');
      }
      if (!controller.signal.aborted) {
        setResult(payload.result);
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError((failure as Error).message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setPending(false);
      }
      request.current = null;
    }
  }

  return (
    <section className="coach-panel" aria-label="나를 위한 AI 제안">
      <span className="eyebrow">A STEP THAT FITS ME</span>
      <h2>지금의 나에게 맞는 한 걸음</h2>
      <p className="muted">원하는 모습과 최근 경험을 함께 살펴볼게요.</p>
      {!result && (
        <>
          <p className="footnote">
            요청하면 페르소나·목표 문장과 최근 기록 최대 10개의 제목·메모·느낌을 OpenAI에 보내
            제안을 만들어요. 메모는 기록당 최대 500자만 사용하며 사진과 이름은 보내지 않아요.
          </p>
          <button
            className="primary"
            disabled={!available || pending}
            onClick={() => void generate()}
          >
            {pending ? '기록을 참고해 제안하는 중…' : '내 기록으로 AI 제안 받기'}
          </button>
          <p className="footnote">
            {available
              ? '요청 시 API 사용료가 발생해요. 하루 최대 5회, 실패도 포함돼요. 기록이 같으면 저장된 제안을 다시 보여줘요.'
              : 'API 키가 설정되지 않아 아래의 샘플 제안을 보여드려요.'}
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="sheet-error">
          {error} 아래 샘플과 직접 기록은 계속 사용할 수 있어요.
        </p>
      )}
      {result && (
        <>
          <span className="demo-tag">
            AI 생성 · {new Date(result.createdAt).toLocaleDateString('ko-KR')}
          </span>
          <p className="coach-encouragement">{result.encouragement}</p>
          {result.suggestions.map((suggestion) => (
            <article className="coach-suggestion" key={suggestion.category}>
              <small>
                {suggestion.category === 'outfit' ? '코디 실천' : '작은 활동'} · 약{' '}
                {suggestion.minutes}분
              </small>
              <h3>{suggestion.title}</h3>
              <p>{suggestion.description}</p>
              <p className="coach-reason">제안한 이유 · {suggestion.reason}</p>
              <button
                className="secondary"
                onClick={() => onRecord(suggestion.category, suggestion.title)}
              >
                실천했어요 · 기록하기
              </button>
            </article>
          ))}
          <details>
            <summary>제안에 참고한 정보</summary>
            <ul>
              {[...new Set(result.toolsUsed)].map((tool) => (
                <li key={tool}>{toolLabels[tool] || '기록 확인'}</li>
              ))}
            </ul>
            <p className="footnote">
              새 기록이나 느낌을 남기면 다음 제안에 반영할 수 있어요. 제안 자체로 보상이 지급되지는
              않아요.
            </p>
          </details>
        </>
      )}
    </section>
  );
}
