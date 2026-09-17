import { InvalidStylingRequestError } from '@/domain/styling/errors';
import { isOccasion, isVibe } from '@/domain/styling/model';
import {
  AVOID_OPTIONS,
  defaultPreferences,
  REFINEMENT_REASONS,
  type RefinementReason,
  type StylingPreferences,
} from '@/domain/styling/preferences';

export function parseGenerateRequest(form: FormData) {
  const image = form.get('image');
  const occasion = form.get('occasion');
  const vibe = form.get('vibe');

  if (
    !(image instanceof File) ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(image.type) ||
    !image.size ||
    image.size > 15 * 1024 * 1024
  ) {
    throw new InvalidStylingRequestError('15MB 이하의 PNG, JPEG, WebP 사진을 선택해 주세요.');
  }

  if (!isOccasion(occasion) || !isVibe(vibe)) {
    throw new InvalidStylingRequestError('상황 또는 추구미가 올바르지 않습니다.');
  }

  let preferences: StylingPreferences = defaultPreferences();
  const rawPreferences = form.get('preferences');

  if (rawPreferences !== null) {
    try {
      if (typeof rawPreferences !== 'string') {
        throw new Error();
      }

      const value = JSON.parse(rawPreferences);

      if (
        !value ||
        !['SUBTLE', 'BOLD'].includes(value.change) ||
        !Array.isArray(value.avoid) ||
        value.avoid.length > 3 ||
        !value.avoid.every((option: unknown) => AVOID_OPTIONS.includes(option as never))
      ) {
        throw new Error();
      }

      preferences = {
        change: value.change,
        avoid: [...new Set(value.avoid)] as StylingPreferences['avoid'],
      };
    } catch {
      throw new InvalidStylingRequestError('스타일 조건이 올바르지 않습니다.');
    }
  }

  const parent = form.get('parentGenerationId');
  const reason = form.get('refinementReason');

  if (
    (parent !== null || reason !== null) &&
    (typeof parent !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(parent) ||
      !REFINEMENT_REASONS.includes(reason as RefinementReason))
  ) {
    throw new InvalidStylingRequestError('수정 요청이 올바르지 않습니다.');
  }

  return {
    image,
    selection: { occasion, vibe },
    preferences,
    parentGenerationId: (parent as string | undefined) ?? undefined,
    refinementReason: (reason as RefinementReason | undefined) ?? undefined,
  };
}
