# Vercel 배포

## 환경변수

Vercel 프로젝트 Settings → Environment Variables에서 환경별로 등록한 뒤 재배포한다.

| 이름 | Production | Preview / 로컬 |
| --- | --- | --- |
| SUPABASE_URL | 운영 Supabase 프로젝트 URL | 개발 Supabase 프로젝트 URL |
| SUPABASE_SECRET_KEY | 운영 서버 전용 Secret key | 개발 서버 전용 Secret key |
| AI_MODE | 기본 비활성. 실제 코치는 live | demo 권장 |
| OPENAI_API_KEY | AI_MODE=live일 때 운영 키 | 실제 호출이 필요할 때만 개발 키 |
| APP_URL | 생략 시 https://chgumi.vercel.app | Preview는 생략하여 VERCEL_URL 사용, 로컬도 생략 |

키에는 NEXT_PUBLIC_을 붙이지 않는다. 로컬은 루트 .env.local에 직접 등록한다.
Vercel Preview의 NODE_ENV도 production일 수 있으므로 도메인은 VERCEL_ENV로 구분한다.
운영 도메인이 바뀌면 Production APP_URL을 새 HTTPS 주소로 설정한다.
프런트는 상대 경로 /api를 사용하므로 별도 API 도메인·CORS 와일드카드는 필요 없다.
이 설정은 서버 요청 출처 검사이며 Vercel 프로젝트의 도메인 소유·연결 설정을 변경하지 않는다.

## 최초 DB 설정

Supabase SQL Editor에서 [마이그레이션](../supabase/migrations/202609180001_life_states.sql)을 실행한다.
생활 데이터는 life_states 테이블의 사용자별 JSON 상태로 저장한다. 테이블의 RLS를 켜고 anon/authenticated 접근과 함수 실행을 막았으며 서버 Secret key만 사용한다.
이미 읽은 revision과 현재 revision이 같은 경우에만 기록·코인·구매 상태를 함께 저장한다. 충돌 시 최신 데이터를 다시 읽어 최대 5회 시도한다. 이 방식으로 Vercel 인스턴스 사이의 덮어쓰기를 방지한다.
기존 data/users 파일은 자동 이관하지 않는다. 브라우저 쿠키를 지우면 기존 데이터로 다시 연결할 수 없다. 계정 로그인·복구 기능은 별도다.

## 확인 순서

1. npm run verify로 테스트와 프로덕션 빌드를 확인한다.
2. npx tsx scripts/check-supabase.ts로 실제 저장·동시 구매를 검사한다. 이 명령은 테스트 사용자 한 명을 만들고 해당 데이터만 삭제한다.
3. Vercel에서 변경된 소스를 배포한다. 환경변수만 바꾼 경우에도 재배포가 필요하다.
4. https://chgumi.vercel.app에서 페르소나 → 기록 → 보상 → 화분 구매 → 새로고침 유지 순으로 확인한다.

## 현재 범위

- 생활 기록·상점·AI 코치 캐시/한도는 Supabase 저장소를 사용한다.
- 두 Supabase 환경변수가 없는 로컬은 기존 파일 저장소를 사용한다. Vercel에서 누락되거나 한쪽만 등록되면 오류를 반환하며 파일로 우회하지 않는다.
- 사진 생성/평가/피드백의 실험 저장소는 아직 로컬 파일 방식이다. 따라서 Vercel에서는 사진 생성 API를 비활성화했다. 사진 생성은 로컬 영속 디스크 환경에서만 사용한다.
- 실제 AI 코치 호출은 API 키와 AI_MODE=live가 필요하다. 실제 유료 AI 호출은 이번 저장소 검증에 포함하지 않았다.
- 개발·운영 데이터 분리는 각 환경에 다른 Supabase 프로젝트 값을 등록해야 성립한다. 코드가 Supabase 프로젝트를 자동 생성하지 않는다.
- 요청 제한은 브라우저 식별자 단위이며, 로그인·전체 서비스 비용 상한·부하 검증을 대체하지 않는다.
