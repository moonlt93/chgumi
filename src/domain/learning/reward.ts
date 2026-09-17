import type { StylingFeedback } from './model';

export function latestFeedback(events: StylingFeedback[], signals: StylingFeedback['signal'][]) {
  return events
    .filter((event) => signals.includes(event.signal))
    .reduce<StylingFeedback | null>(
      (latest, event) => (!latest || event.sequence > latest.sequence ? event : latest),
      null,
    );
}

export function generationReward(events: StylingFeedback[]): number | null {
  const vote = latestFeedback(events, ['LIKE', 'DISLIKE']);
  if (!vote) {
    return null;
  }
  return vote.signal === 'LIKE' ? 1 : 0;
}
