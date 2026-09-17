import { createHash, timingSafeEqual } from 'node:crypto';

export function canReview(
  authorization: string | null,
  expectedToken = process.env.REVIEW_ACCESS_TOKEN,
): boolean {
  if (!expectedToken || expectedToken.length < 24 || !authorization?.startsWith('Bearer ')) {
    return false;
  }
  const suppliedToken = authorization.slice(7);
  return timingSafeEqual(
    createHash('sha256').update(suppliedToken).digest(),
    createHash('sha256').update(expectedToken).digest(),
  );
}
