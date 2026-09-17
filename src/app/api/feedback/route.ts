import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { StylingError } from '@/domain/styling/errors';
import { stylingContainer } from '@/infrastructure/composition/styling-container';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('chugumi-session')?.value;
  if (!sessionId) {
    return NextResponse.json({ message: '생성 세션이 없습니다.' }, { status: 401 });
  }
  try {
    const events = await stylingContainer.recordFeedback.read(
      request.nextUrl.searchParams.get('generationId'),
      sessionId,
    );
    return NextResponse.json({ events }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return feedbackError(error);
  }
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('chugumi-session')?.value;
  if (!sessionId) {
    return NextResponse.json({ message: '생성 세션이 없습니다.' }, { status: 401 });
  }
  try {
    const event = await stylingContainer.recordFeedback.execute(await request.json(), sessionId);
    return NextResponse.json({ event }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return feedbackError(error);
  }
}

function feedbackError(error: unknown) {
  return NextResponse.json(
    { message: error instanceof StylingError ? error.message : '피드백을 저장하지 못했습니다.' },
    {
      status: error instanceof StylingError || error instanceof SyntaxError ? 400 : 500,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
