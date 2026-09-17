import { randomUUID } from 'node:crypto';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { parseGenerateRequest } from '@/application/styling/parse-generate-request';
import { GenerationUnavailableError, StylingError } from '@/domain/styling/errors';
import { stylingContainer } from '@/infrastructure/composition/styling-container';
import { aiAvailable } from '@/infrastructure/config/server-environment';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!aiAvailable() || process.env.VERCEL) {
    return NextResponse.json(
      {
        code: 'GENERATION_UNAVAILABLE',
        message: '현재 환경에서는 사진 생성을 사용할 수 없습니다.',
      },
      { status: 503 },
    );
  }
  try {
    const input = parseGenerateRequest(await req.formData());
    const sessionId = req.cookies.get('chugumi-session')?.value || randomUUID();
    const result = await stylingContainer.generateStyling.execute({
      ...input,
      sessionId,
      signal: req.signal,
    });
    const response = new NextResponse(new Uint8Array(result.image.bytes), {
      headers: {
        'Content-Type': result.image.contentType,
        'Cache-Control': 'no-store',
        'X-Generation-Id': result.generationId,
        'X-Prompt-Variant': result.variant,
        'X-Evaluation-Status': result.evaluationStatus,
      },
    });

    response.cookies.set('chugumi-session', sessionId, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 86400 * 7,
    });

    return response;
  } catch (error) {
    console.error(error);

    if (error instanceof StylingError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error instanceof GenerationUnavailableError ? 503 : 400 },
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
