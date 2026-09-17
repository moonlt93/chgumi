export type EvaluationScore = {
  identityPreservation: number;
  bodyPreservation: number;
  posePreservation: number;
  vibeMatch: number;
  occasionMatch: number;
  outfitCoherence: number;
  realism: number;
  total: number;
  notes: string[];
};

export const EVALUATION_WEIGHTS = {
  identityPreservation: 0.25,
  bodyPreservation: 0.15,
  posePreservation: 0.1,
  vibeMatch: 0.2,
  occasionMatch: 0.15,
  outfitCoherence: 0.1,
  realism: 0.05,
} as const;

export function weightedTotal(score: Omit<EvaluationScore, 'total' | 'notes'>) {
  return Math.round(
    Object.entries(EVALUATION_WEIGHTS).reduce((sum, [key, weight]) => {
      return sum + score[key as keyof typeof EVALUATION_WEIGHTS] * weight;
    }, 0),
  );
}

export function buildJudgePrompt(occasion: string, vibe: string) {
  return `You are evaluating a virtual styling image edit. Compare BEFORE and AFTER.\nTarget occasion: ${occasion}\nTarget vibe: ${vibe}\nScore each field from 0 to 100. Do not score attractiveness. Judge preservation and styling adherence only.\n\nPreservation: identityPreservation, bodyPreservation, posePreservation.\nStyling: vibeMatch, occasionMatch, outfitCoherence.\nQuality: realism.\n\nReturn strict JSON with those seven numeric fields and a notes array of at most 3 short failure observations.`;
}

export function parseEvaluationScore(value: unknown): EvaluationScore {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Evaluation response must be an object.');
  }

  const fields = value as Record<string, unknown>;

  function readScore(name: keyof typeof EVALUATION_WEIGHTS): number {
    const score = fields[name];

    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`Invalid evaluation score: ${name}`);
    }

    return score;
  }

  const notes = fields.notes;

  if (
    !Array.isArray(notes) ||
    notes.length > 3 ||
    !notes.every((note) => typeof note === 'string')
  ) {
    throw new Error('Evaluation notes must contain at most three strings.');
  }

  const scores = {
    identityPreservation: readScore('identityPreservation'),
    bodyPreservation: readScore('bodyPreservation'),
    posePreservation: readScore('posePreservation'),
    vibeMatch: readScore('vibeMatch'),
    occasionMatch: readScore('occasionMatch'),
    outfitCoherence: readScore('outfitCoherence'),
    realism: readScore('realism'),
  };

  return { ...scores, notes, total: weightedTotal(scores) };
}
