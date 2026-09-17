import assert from 'node:assert/strict';
import test from 'node:test';

import { parseEvaluationScore } from '../src/infrastructure/evaluation/evaluation';

const validScore = {
  identityPreservation: 80,
  bodyPreservation: 80,
  posePreservation: 80,
  vibeMatch: 80,
  occasionMatch: 80,
  outfitCoherence: 80,
  realism: 80,
  notes: [],
};

test('evaluation decoder computes the total from validated scores', () => {
  assert.equal(parseEvaluationScore({ ...validScore, total: 999 }).total, 80);
});
test('evaluation decoder rejects missing, invalid, or out-of-range fields', () => {
  for (const value of [
    null,
    {},
    { ...validScore, realism: 101 },
    { ...validScore, realism: NaN },
    { ...validScore, realism: '80' },
    { ...validScore, notes: [42] },
  ]) {
    assert.throws(() => parseEvaluationScore(value));
  }
});
