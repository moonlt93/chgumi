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
  posePreservation: 0.10,
  vibeMatch: 0.20,
  occasionMatch: 0.15,
  outfitCoherence: 0.10,
  realism: 0.05,
} as const;

export function weightedTotal(score: Omit<EvaluationScore, 'total' | 'notes'>) {
  return Math.round(Object.entries(EVALUATION_WEIGHTS).reduce((sum, [key, weight]) => {
    return sum + score[key as keyof typeof EVALUATION_WEIGHTS] * weight;
  }, 0));
}

export function buildJudgePrompt(occasion: string, vibe: string) {
  return `You are evaluating a virtual styling image edit. Compare BEFORE and AFTER.\nTarget occasion: ${occasion}\nTarget vibe: ${vibe}\nScore each field from 0 to 100. Do not score attractiveness. Judge preservation and styling adherence only.\n\nPreservation: identityPreservation, bodyPreservation, posePreservation.\nStyling: vibeMatch, occasionMatch, outfitCoherence.\nQuality: realism.\n\nReturn strict JSON with those seven numeric fields and a notes array of at most 3 short failure observations.`;
}
