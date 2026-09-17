'use client';

import { AVOID_OPTIONS } from '@/domain/styling/preferences';

import { useStylingStore } from '../styling-store';

const labels = { OVERSIZED: '오버핏', BOLD_COLORS: '강한 색·패턴', ACCESSORIES: '액세서리' };

export function Preferences() {
  const preferences = useStylingStore((state) => state.preferences);
  const setPreferences = useStylingStore((state) => state.setPreferences);

  return (
    <section className="mt-6 rounded-2xl bg-zinc-50 p-4" aria-label="스타일 조건">
      <fieldset>
        <legend className="font-bold">얼마나 바꾸고 싶나요?</legend>
        <div className="mt-3 flex gap-4">
          {(['SUBTLE', 'BOLD'] as const).map((change) => (
            <label key={change} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="change"
                checked={preferences.change === change}
                onChange={() => setPreferences({ ...preferences, change })}
              />
              {change === 'SUBTLE' ? '조금만 자연스럽게' : '확실한 변화'}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-5">
        <legend className="font-bold">피하고 싶은 요소</legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {AVOID_OPTIONS.map((avoid) => (
            <label key={avoid} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={preferences.avoid.includes(avoid)}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    avoid: event.target.checked
                      ? [...preferences.avoid, avoid]
                      : preferences.avoid.filter((option) => option !== avoid),
                  })
                }
              />
              {labels[avoid]}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-4 text-xs text-zinc-500">
        조건을 고른 뒤 아래 추구미를 선택하면 코디를 만들어요.
      </p>
    </section>
  );
}
