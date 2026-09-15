# CHUGUMI Adaptive MVP

사진 → 상황 → 추구미 → GPT Image 편집 → 다운로드까지 동작하는 Next.js MVP입니다. DB/SQS 없이 실행되며, 사용자 피드백을 이용한 **A/B + epsilon-greedy contextual bandit** 루프를 포함합니다.

> 여기서 "강화"는 모델 weight를 재학습하는 RL이 아니라, 성공 신호(다운로드/좋아요)를 reward로 삼아 상황×추구미별로 더 성과가 좋은 Prompt Variant의 노출 비율을 자동으로 높이는 온라인 정책 학습입니다. 해커톤/초기 서비스에서 안전하고 검증하기 쉬운 형태입니다.

## 실행
```bash
npm install
cp .env.example .env.local
# .env.local의 OPENAI_API_KEY 입력
npm run dev
```
브라우저에서 http://localhost:3000

## 적응 루프
1. 생성 요청의 context = occasion × vibe
2. `CONTROL`, `PRESERVE_FIRST`, `STYLE_FIRST` 중 variant 선택
3. 기본 15%는 탐색(exploration), 나머지는 누적 reward가 높은 variant 선택
4. 결과 화면의 좋아요/다운로드 = reward 1, 싫어요/다시 생성 = reward 0
5. `data/feedback.jsonl`에 append-only 기록
6. 다음 요청부터 해당 context의 reward rate가 정책에 반영됨

통계 확인: `/api/experiment?occasion=DATE&vibe=DANDY`

## DDD-ish 구조
- `domain/styling`: 스타일링 모델/Port
- `domain/learning`: 실험 Variant, Feedback, Reward, Repository/Policy Port
- `application/styling`: 생성 Use Case
- `application/learning`: Variant 선택/Feedback 기록 Use Case
- `infrastructure/ai`: OpenAI 이미지 Adapter + Prompt Variant
- `infrastructure/learning`: File Repository + epsilon-greedy Policy
- `infrastructure/storage`: S3 ObjectStorage Adapter (선택)
- `presentation`: Zustand feature state + hooks + reusable UI

## AWS 확장
SQS는 이 ZIP의 실행 전제에 넣지 않았습니다. 이미지 생성은 현재 동기식입니다. `ObjectStoragePort`와 `S3ObjectStorage`는 미리 분리되어 있어 AWS에서 임시 입력/결과 저장이 필요해질 때 Adapter만 composition root에 연결할 수 있습니다. 로컬 실행에는 AWS 계정이 필요하지 않습니다.

운영 시에는 IAM Role을 권장하며 S3 Lifecycle로 임시 이미지를 자동 삭제하는 방식이 적합합니다.

## Evaluation
```bash
npm run eval
```
정적 테스트 이미지를 이용해 prompt version별 생성/vision judge 평가를 수행합니다. 온라인 A/B reward와 offline evaluation은 분리되어 있습니다.
