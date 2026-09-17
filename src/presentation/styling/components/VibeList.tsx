'use client';

import { vibeCatalog } from '@/domain/styling/catalog';

import { useStylingFlow } from '../use-styling-flow';

export function VibeList() {
  const { selectVibe } = useStylingFlow();

  return (
    <div className="mt-8 space-y-3">
      {vibeCatalog.map((vibe) => (
        <button
          key={vibe.id}
          onClick={() => selectVibe(vibe.id)}
          className={`relative h-36 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${vibe.gradient} p-5 text-left text-white active:scale-[.98]`}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative mt-14">
            <div className="text-2xl font-black">{vibe.name}</div>
            <div className="text-sm text-white/80">{vibe.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
