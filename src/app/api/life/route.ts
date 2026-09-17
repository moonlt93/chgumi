import { randomUUID } from 'node:crypto';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ManageLife, today } from '@/application/life/manage-life';
import type { LifeState } from '@/domain/life/model';
import { LifeError } from '@/domain/life/model';
import { aiAvailable, sameOrigin } from '@/infrastructure/config/server-environment';
import { createLifeRepository } from '@/infrastructure/life/life-repository';
import { LifeStorageError } from '@/infrastructure/life/supabase-life-repository';

export const runtime = 'nodejs';
const cookieName = 'chugumi-life';

function userId(request: NextRequest) {
  const id = request.cookies.get(cookieName)?.value;
  return id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : randomUUID();
}
function response(state: LifeState, id: string, request: NextRequest) {
  const result = NextResponse.json(
    {
      state: { ...state, entries: state.entries.filter((entry) => !entry.deleted) },
      today: today(),
      aiAvailable: aiAvailable(),
      photoAvailable: aiAvailable() && !process.env.VERCEL,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  result.cookies.set(cookieName, id, {
    httpOnly: true,
    sameSite: 'strict',
    secure: Boolean(process.env.VERCEL) || request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return result;
}
export async function GET(request: NextRequest) {
  try {
    const id = userId(request);
    return response(await createLifeRepository().read(id), id, request);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof LifeStorageError
            ? error.message
            : '저장된 데이터를 읽지 못했습니다. 서버 저장 경로를 확인해 주세요.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
export async function POST(request: NextRequest) {
  if (
    !sameOrigin(request) ||
    !request.headers.get('content-type')?.startsWith('application/json')
  ) {
    return NextResponse.json({ message: '허용되지 않은 요청입니다.' }, { status: 403 });
  }
  try {
    const reader = request.body?.getReader();
    if (!reader) {
      throw new LifeError('요청이 비어 있습니다.');
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new LifeError('입력 내용이 너무 깁니다.');
      }
      chunks.push(value);
    }
    const input: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const id = userId(request);
    const manager = new ManageLife(createLifeRepository());
    return response(await manager.execute(id, input), id, request);
  } catch (error) {
    const expected = error instanceof LifeError || error instanceof SyntaxError;
    return NextResponse.json(
      {
        message:
          expected || error instanceof LifeStorageError
            ? error.message
            : '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      },
      { status: expected ? 400 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
