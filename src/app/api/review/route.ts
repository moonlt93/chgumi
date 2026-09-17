import { NextResponse } from 'next/server';

import { ListReviews } from '@/application/review/list-reviews';
import { stylingContainer } from '@/infrastructure/composition/styling-container';
import { canReview } from '@/infrastructure/review/authorize-review';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!canReview(request.headers.get('authorization'))) {
    return NextResponse.json(
      { message: '검토 화면 접근 키를 확인해 주세요.' },
      { status: 401, headers },
    );
  }
  const offset = Number(new URL(request.url).searchParams.get('offset') ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) {
    return NextResponse.json({ message: '올바르지 않은 페이지입니다.' }, { status: 400, headers });
  }
  try {
    return NextResponse.json(await new ListReviews(stylingContainer.experiments).execute(offset), {
      headers,
    });
  } catch {
    return NextResponse.json({ message: '검토 기록을 읽지 못했습니다.' }, { status: 500, headers });
  }
}
