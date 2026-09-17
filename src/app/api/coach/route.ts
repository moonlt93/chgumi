import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { RecommendLife } from '@/application/life/recommend-life';
import { CoachError } from '@/domain/life/coach';
import { aiAvailable, sameOrigin } from '@/infrastructure/config/server-environment';
import { createLifeRepository } from '@/infrastructure/life/life-repository';
import { OpenAILifeCoach } from '@/infrastructure/life/openai-life-coach';
import { LifeStorageError } from '@/infrastructure/life/supabase-life-repository';

export const runtime = 'nodejs';
export const maxDuration = 60;
function recommender() {
  return new RecommendLife(createLifeRepository(), new OpenAILifeCoach());
}

function session(request: NextRequest) {
  const id = request.cookies.get('chugumi-life')?.value;
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new CoachError('내 방을 먼저 열어 주세요.', 401);
  }
  return id;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function failure(error: unknown) {
  return json(
    {
      message:
        error instanceof CoachError || error instanceof LifeStorageError
          ? error.message
          : '저장된 제안을 읽거나 저장하지 못했습니다.',
    },
    error instanceof CoachError ? error.status : 500,
  );
}

export async function GET(request: NextRequest) {
  try {
    return json({ result: await recommender().read(session(request)) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) {
      throw new CoachError('허용되지 않은 요청입니다.', 403);
    }
    const id = session(request);
    if (!aiAvailable()) {
      throw new CoachError(
        '서버에서 AI 호출을 활성화하고 API 키를 설정해 주세요. 샘플 제안은 계속 사용할 수 있어요.',
      );
    }
    return json({ result: await recommender().execute(id, request.signal) });
  } catch (error) {
    return failure(error);
  }
}
