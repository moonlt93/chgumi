import { NextResponse } from 'next/server';

import { isOccasion, isVibe } from '@/domain/styling/model';
import { stylingContainer } from '@/infrastructure/composition/styling-container';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const occasion = url.searchParams.get('occasion');
  const vibe = url.searchParams.get('vibe');

  if (!isOccasion(occasion) || !isVibe(vibe)) {
    return NextResponse.json({ message: '올바른 occasion과 vibe가 필요합니다.' }, { status: 400 });
  }

  return NextResponse.json(
    { occasion, vibe, stats: await stylingContainer.experiments.stats({ occasion, vibe }) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
