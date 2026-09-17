import type { Category, Slot } from './catalog';
import type { CoachResult } from './coach';

export interface LifeEntry {
  id: string;
  day: string;
  category: Category;
  title: string;
  note: string;
  feeling: string;
  createdAt: string;
  deleted?: boolean;
}
export interface LifeState {
  version: 1;
  coachCache?: { fingerprint: string; result: CoachResult };
  coachUsage?: { day: string; attempts: number; lastAttemptAt: string };
  profile: { name: string; persona: string; aspiration: string } | null;
  xp: number;
  coins: number;
  owned: string[];
  equipped: Partial<Record<Slot, string>>;
  entries: LifeEntry[];
  ledger: { key: string; xp: number; coins: number; createdAt: string }[];
}
export const initialState = (): LifeState => ({
  version: 1,
  profile: null,
  xp: 0,
  coins: 0,
  owned: [],
  equipped: {},
  entries: [],
  ledger: [],
});
export class LifeError extends Error {}
export interface LifeRepository {
  read(userId: string): Promise<LifeState>;
  // Optimistic concurrency may replay change with fresh state; keep it free of I/O.
  update(userId: string, change: (state: LifeState) => void): Promise<LifeState>;
}
