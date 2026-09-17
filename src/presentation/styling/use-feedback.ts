'use client';

import { useEffect, useRef, useState } from 'react';

import type { FeedbackInput, StylingFeedback } from '@/domain/learning/model';
import { latestFeedback } from '@/domain/learning/reward';

import { useStylingStore } from './styling-store';

export function useFeedback() {
  const generationId = useStylingStore((state) => state.generationId);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [events, setEvents] = useState<StylingFeedback[]>([]);
  const sending = useRef(false);
  const retry = useRef<{ key: string; eventId: string } | null>(null);

  useEffect(() => {
    if (!generationId) {
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/feedback?generationId=${generationId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error();
        }
        const body = (await response.json()) as { events: StylingFeedback[] };
        if (!controller.signal.aborted) {
          setEvents((current) => [
            ...new Map(
              [...body.events, ...current].map((event) => [event.eventId, event]),
            ).values(),
          ]);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMessage('이전 의견을 불러오지 못했어요. 새 의견은 남길 수 있어요.');
        }
      });
    return () => controller.abort();
  }, [generationId]);

  async function send(
    signal: FeedbackInput['signal'],
    details: Pick<FeedbackInput, 'reason' | 'comparison'> = {},
  ) {
    if (!generationId || sending.current) {
      return;
    }
    sending.current = true;
    setPending(true);
    const key = JSON.stringify({ generationId, signal, ...details });
    if (retry.current?.key !== key) {
      retry.current = { key, eventId: crypto.randomUUID() };
    }
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: retry.current.eventId, generationId, signal, ...details }),
      });
      if (!response.ok) {
        throw new Error();
      }
      const body = (await response.json()) as { event: StylingFeedback };
      setEvents((current) => [
        ...current.filter((event) => event.eventId !== body.event.eventId),
        body.event,
      ]);
      retry.current = null;
      setMessage('의견을 저장했어요. 다시 선택하면 변경할 수 있어요.');
    } catch {
      setMessage('저장하지 못했어요. 같은 버튼을 누르면 다시 전송해요.');
    } finally {
      sending.current = false;
      setPending(false);
    }
  }
  const currentEvents = events.filter((event) => event.generationId === generationId);
  return {
    send,
    pending,
    message,
    latestVote: latestFeedback(currentEvents, ['LIKE', 'DISLIKE']),
    latestComparison: latestFeedback(currentEvents, ['COMPARE']),
  };
}
