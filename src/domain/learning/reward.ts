import type { FeedbackSignal } from './model';
export const rewardFor = (signal: FeedbackSignal) => ({ DOWNLOAD: 1, LIKE: 1, REGENERATE: 0, DISLIKE: 0 }[signal]);
