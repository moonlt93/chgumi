# CHUGUMI Evaluation

최소 회귀 평가 세트입니다.

- P0: vibe만 적용
- P1: + identity 보존
- P2: + body/pose/background 보존
- P3: + occasion 적합성

평가 지표: identity 25%, body 15%, pose 10%, vibe 20%, occasion 15%, outfit coherence 10%, realism 5%.

`cases.json`의 static test image를 각 prompt version으로 생성한 뒤 `results/sample-scores.json`과 같은 형태로 기록합니다. 실제 Vision Judge를 연결할 때는 `src/lib/ai/evaluation.ts`의 `buildJudgePrompt`와 `weightedTotal`을 그대로 사용하면 됩니다.
