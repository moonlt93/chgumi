'use client';

import { occasionCatalog } from '@/domain/styling/catalog';

import { useStylingFlow } from '../use-styling-flow';

export function OccasionGrid() {
  const { selectOccasion } = useStylingFlow();

  return (
    <div className="mt-8 grid grid-cols-2 gap-3">
      {occasionCatalog.map((occasion) => (
        <button
          key={occasion.id}
          onClick={() => selectOccasion(occasion.id)}
          className="rounded-3xl bg-zinc-100 p-5 text-left active:scale-95"
        >
          <div className="text-3xl">{occasion.emoji}</div>
          <div className="mt-8 text-xl font-black">{occasion.title}</div>
          <div className="mt-1 text-sm text-zinc-500">{occasion.description}</div>
        </button>
      ))}
    </div>
  );
}
