import type { LifeRepository, LifeState } from '../../domain/life/model';
import { initialState } from '../../domain/life/model';

export class LifeStorageError extends Error {}

interface Snapshot {
  revision: number;
  state: LifeState;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSnapshot(value: unknown): Snapshot {
  if (!isObject(value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 1) {
    throw new LifeStorageError('저장된 데이터 형식을 확인해 주세요.');
  }
  const state = value.state;
  if (
    !isObject(state) ||
    state.version !== 1 ||
    !Number.isSafeInteger(state.coins) ||
    Number(state.coins) < 0 ||
    !Number.isSafeInteger(state.xp) ||
    Number(state.xp) < 0 ||
    !Array.isArray(state.entries) ||
    !Array.isArray(state.ledger) ||
    !Array.isArray(state.owned) ||
    !isObject(state.equipped) ||
    !(state.profile === null || isObject(state.profile))
  ) {
    throw new LifeStorageError('저장된 데이터 형식을 확인해 주세요.');
  }
  return { revision: Number(value.revision), state: state as unknown as LifeState };
}

export class SupabaseLifeRepository implements LifeRepository {
  constructor(
    private readonly url: string,
    private readonly secret: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  private async call(path: string, body?: unknown): Promise<unknown> {
    const base = new URL(this.url);
    if (base.protocol !== 'https:' || base.username || base.password) {
      throw new LifeStorageError('SUPABASE_URL에 HTTPS 프로젝트 주소를 설정해 주세요.');
    }

    let response: Response;
    try {
      response = await this.request(new URL(`/rest/v1/${path}`, base), {
        method: body === undefined ? 'GET' : 'POST',
        headers: { apikey: this.secret, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new LifeStorageError('저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
    if (!response.ok) {
      if (response.status === 404) {
        throw new LifeStorageError('Supabase 테이블과 함수 생성 SQL을 먼저 실행해 주세요.');
      }
      if (response.status === 401 || response.status === 403) {
        throw new LifeStorageError('서버의 Supabase 키와 접근 권한을 확인해 주세요.');
      }
      throw new LifeStorageError('저장소 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
    try {
      return await response.json();
    } catch {
      throw new LifeStorageError('저장소 응답 형식을 확인해 주세요.');
    }
  }

  private async snapshot(userId: string): Promise<Snapshot> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      throw new LifeStorageError('사용자 식별자가 올바르지 않습니다.');
    }
    const rows = await this.call(`life_states?user_id=eq.${userId}&select=revision,state`);
    if (!Array.isArray(rows) || rows.length > 1) {
      throw new LifeStorageError('저장소 응답 형식을 확인해 주세요.');
    }
    return rows.length === 0 ? { revision: 0, state: initialState() } : parseSnapshot(rows[0]);
  }

  async read(userId: string): Promise<LifeState> {
    return (await this.snapshot(userId)).state;
  }

  async update(userId: string, change: (state: LifeState) => void): Promise<LifeState> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const snapshot = await this.snapshot(userId);
      change(snapshot.state);
      const saved = await this.call('rpc/save_life_state', {
        p_user_id: userId,
        p_revision: snapshot.revision,
        p_state: snapshot.state,
      });
      if (saved === true) {
        return snapshot.state;
      }
      if (saved !== false) {
        throw new LifeStorageError('저장소 응답 형식을 확인해 주세요.');
      }
    }
    throw new LifeStorageError('동시에 처리 중인 요청이 많습니다. 잠시 후 다시 시도해 주세요.');
  }
}
