import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { LifeRepository, LifeState } from '../../domain/life/model';
import { initialState } from '../../domain/life/model';

const queues = new Map<string, Promise<unknown>>();
export class FileLifeRepository implements LifeRepository {
  constructor(
    private readonly directory = process.env.LIFE_DATA_DIR ||
      path.join(process.cwd(), 'data/users'),
  ) {}

  private file(userId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      throw new Error('Invalid user identifier');
    }
    return path.resolve(this.directory, `${userId}.json`);
  }

  async read(userId: string): Promise<LifeState> {
    try {
      const state = JSON.parse(await fs.readFile(this.file(userId), 'utf8')) as LifeState;
      if (
        state.version !== 1 ||
        !Number.isSafeInteger(state.coins) ||
        state.coins < 0 ||
        !Array.isArray(state.entries) ||
        !Array.isArray(state.ledger)
      ) {
        throw new Error('Invalid saved state');
      }
      return state;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return initialState();
      }
      throw error;
    }
  }

  async update(userId: string, change: (state: LifeState) => void): Promise<LifeState> {
    const file = this.file(userId);
    const previous = queues.get(file) ?? Promise.resolve();
    const pending = previous
      .catch(() => undefined)
      .then(async () => {
        const state = await this.read(userId);
        change(state);
        await fs.mkdir(path.dirname(file), { recursive: true });
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
          await fs.writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
          await fs.rename(temporary, file);
        } finally {
          await fs.unlink(temporary).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== 'ENOENT') {
              throw error;
            }
          });
        }
        return state;
      });
    queues.set(file, pending);
    try {
      return await pending;
    } finally {
      if (queues.get(file) === pending) {
        queues.delete(file);
      }
    }
  }
}
