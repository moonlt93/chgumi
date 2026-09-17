# CHUGUMI Evaluation

`npm run eval`은 정적 사진을 편집하고 운영과 같은 `OpenAIStylingEvaluator`로 평가합니다. 외부 API 비용이 발생합니다.

기본 후보는 `CONTROL,PRESERVE_FIRST,STYLE_FIRST`이며 `EVAL_PROMPT_VERSIONS`로 변경합니다. `P0,P1,P2,P3`는 과거 프롬프트 구성 요소 비교용입니다.

평가는 인물 보존·체형 보존·사용자 조건·스타일 적합성별 pass/fail/uncertain과 근거를 반환합니다. 평가 모델과 evaluatorVersion도 보고서에 기록합니다. 기존 sample-scores.json의 숫자 점수는 과거 예시이며 현재 평가 결과가 아닙니다.

기본은 첫 번째 사진 한 장입니다. `EVAL_CASE_LIMIT=5`로 등록된 다섯 케이스를 평가합니다. 결과는 evaluation/report.json, 생성 이미지는 evaluation/generated에 저장됩니다. 운영 서비스는 이미지 파일을 보관하지 않으며, 이 CLI의 정적 테스트 결과만 로컬 디스크에 저장합니다.

현재 CLI는 기본 사용자 조건의 초기 생성을 평가합니다. cases.json의 expected는 사람이 참고하는 기준이며 자동 평가 입력으로 사용하지 않습니다. 실제 사용자 선호와 모델 판정의 일치율은 별도 검증해야 합니다.
