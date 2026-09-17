import type { LifeRepository } from '../../domain/life/model';
import { FileLifeRepository } from './file-life-repository';
import { LifeStorageError, SupabaseLifeRepository } from './supabase-life-repository';

export function createLifeRepository(
  env: Readonly<Record<string, string | undefined>> = process.env,
): LifeRepository {
  const url = env.SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY;
  if (url && secret) {
    return new SupabaseLifeRepository(url, secret);
  }
  if (url || secret || env.VERCEL) {
    throw new LifeStorageError('SUPABASE_URL과 SUPABASE_SECRET_KEY를 모두 설정해 주세요.');
  }
  return new FileLifeRepository(env.LIFE_DATA_DIR);
}
