'use client';

import { useState } from 'react';

export function ImageComparison({
  before,
  after,
  beforeLabel = '원본',
  afterLabel = '코디',
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [split, setSplit] = useState(50);

  return (
    <section className="mt-6" aria-label={`${beforeLabel} / ${afterLabel} 비교`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-zinc-100">
        <img src={after} alt={afterLabel} className="absolute h-full w-full object-contain" />
        <div
          className="absolute inset-0 bg-zinc-100"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        >
          <img src={before} alt={beforeLabel} className="h-full w-full object-contain" />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 border-l-2 border-white"
          style={{ left: `${split}%` }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          {beforeLabel}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          {afterLabel}
        </span>
      </div>
      <label className="mt-3 block text-sm text-zinc-600">
        좌우로 움직여 두 이미지를 비교해 보세요.
        <input
          type="range"
          min="0"
          max="100"
          value={split}
          onChange={(event) => setSplit(Number(event.target.value))}
          className="mt-3 w-full accent-zinc-900"
          aria-label={`${beforeLabel} 표시 비율`}
        />
      </label>
    </section>
  );
}
