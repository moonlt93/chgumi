import type { ComparisonChoice, FeedbackReason, FeedbackSignal } from './model';

export const feedbackReasonLabels: Record<FeedbackReason, string> = {
  IDENTITY_CHANGED: '얼굴이 달라졌어요',
  BODY_CHANGED: '체형이 달라졌어요',
  TOO_FLASHY: '너무 화려해요',
  TOO_FORMAL: '너무 격식 있어요',
  FIT_NOT_RIGHT: '핏이 마음에 안 들어요',
  OTHER: '다른 이유',
};
export const comparisonLabels: Record<ComparisonChoice, string> = {
  BETTER: '수정 후가 좋아요',
  SAME: '비슷해요',
  WORSE: '수정 전이 좋아요',
};
export const feedbackSignalLabels: Record<FeedbackSignal, string> = {
  LIKE: '입고 싶어요',
  DISLIKE: '아쉬워요',
  REPORT: '품질 문제',
  COMPARE: '수정 전후 평가',
  DOWNLOAD: '사진 저장',
};
