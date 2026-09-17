# 코드 컨벤션

## 기준

TypeScript에는 모든 프로젝트가 따르는 단일 스타일 표준이 없다. 이 저장소는 ESLint·typescript-eslint 권장 규칙과 React Hooks 규칙을 기본으로 사용한다. 줄 길이·따옴표·파일명은 아래 프로젝트 규칙으로 통일한다.

| 항목 | 규칙 | 적용 도구 |
| --- | --- | --- |
| 들여쓰기·개행 | 공백 2칸, LF, 파일 끝 개행 | EditorConfig, Prettier |
| 줄 길이 | 100자를 줄바꿈 목표로 사용. 문자열을 강제로 분할하지 않음 | Prettier |
| 따옴표·세미콜론 | JS/TS 작은따옴표, JSX 큰따옴표, 세미콜론 사용 | Prettier |
| 변수 선언 | 선언 하나당 변수 하나. 구조 분해는 허용 | ESLint `one-var` |
| 조건·반복문 | 한 줄짜리 분기에도 중괄호 사용 | ESLint `curly` |
| 비교 | `===`, `!==` 사용 | ESLint `eqeqeq` |
| import | 부수 효과 → Node 내장 → 외부 패키지 → 내부 경로 그룹. 그룹 안은 자동 정렬 | simple-import-sort |
| 타입 import | 타입만 쓰는 의존성은 `import type` | typescript-eslint |
| 미사용 코드 | 미사용 변수·import를 남기지 않음. 인터페이스 때문에 필요한 미사용 인자만 `_` 접두사 허용 | typescript-eslint |
| 타입 | 명시적 `any` 금지. 외부 데이터는 `unknown`으로 받고 사용 전 검사 | ESLint + 코드 리뷰 |
| 오류 | 빈 catch 금지. 무시 가능한 오류의 종류와 이유를 명확히 표시 | ESLint + 코드 리뷰 |
| React | Hook 호출 순서·의존성·공식 권장 규칙 준수 | eslint-plugin-react-hooks |

## 이름과 파일

- 변수·함수는 camelCase, 컴포넌트·타입·클래스는 PascalCase, Hook은 `use`로 시작한다.
- 고정된 도메인 값·환경 상수는 UPPER_SNAKE_CASE를 사용한다. 모든 `const`를 대문자로 쓰지는 않는다.
- 역할이 드러나는 이름을 사용한다: `response`, `formData`, `abortController`, `downloadLink`.
- `id`, `url`처럼 널리 쓰이는 약어는 허용한다. 단순 정렬의 `left/right`, 반복의 `index`처럼 범위가 좁은 이름도 허용한다. 글자 수만으로 좋은 이름을 강제하지 않는다.
- UI 이벤트 핸들러는 `handlePhotoChange`처럼 행동을 표현한다. 외부로 받는 이벤트 prop은 `onChange`처럼 `on`으로 시작한다.
- 기존 파일명 규칙을 유지한다: 컴포넌트는 `PhotoPicker.tsx`, 기타 모듈은 `use-styling-flow.ts`. Next.js 예약 파일명은 그대로 둔다.

## 읽는 순서와 공백

파일은 directive → import → 타입·상수 → 주요 함수/컴포넌트 순으로 배치한다. 함수 내부는 입력 확인 → 계산/요청 → 결과 반환 순으로 읽히게 한다.

연속된 변수 선언이나 FormData 구성은 붙여 쓰고, 입력 검증·네트워크 요청·결과 반영처럼 목적이 바뀌는 곳에는 빈 줄 하나를 둔다. 모든 줄 사이에 빈 줄을 넣지 않는다. 서로 다른 함수·클래스 메서드는 빈 줄로 구분한다.

```ts
const formData = new FormData();
formData.append('image', image);
formData.append('vibe', vibe);

const response = await fetch('/api/generate', {
  method: 'POST',
  body: formData,
});

if (!response.ok) {
  throw new Error('이미지 생성에 실패했습니다.');
}

return response.blob();
```

## 구조와 주석

- 단순 값을 전달하는 함수마다 클래스나 인터페이스를 추가하지 않는다. 외부 I/O 교체와 테스트에 필요한 경계는 유지한다.
- JSX가 길다는 이유만으로 분리하지 않는다. 독립된 책임·반복되는 UI·자체 상태가 있을 때 컴포넌트로 분리한다.
- 주석은 코드에 드러나지 않는 이유·제약을 설명한다. 함수 내용을 그대로 번역하는 주석은 쓰지 않는다.
- 타입 단언은 런타임 검증이 아니다. JSON을 타입 단언만으로 신뢰하지 않는다.
- `void`로 Promise를 버릴 때에는 호출한 함수가 실패를 처리하는지 확인한다.

## 명령

```bash
npm run format       # 자동 포맷
npm run lint:fix     # 자동 수정 가능한 코드 규칙 적용
npm run check        # 포맷 + lint + 타입 + 회귀 테스트
```

이름의 의미, 함수 책임, 빈 줄의 논리적 위치는 코드 리뷰 대상이다. 자동 검사 통과가 가독성이나 정확성을 모두 보장하지는 않는다.

## 근거

- [Prettier 옵션](https://prettier.io/docs/options): 들여쓰기와 줄바꿈 설정. 100자는 이 프로젝트 선택이다.
- [typescript-eslint 시작하기](https://typescript-eslint.io/getting-started/): ESLint 및 TypeScript 권장 설정.
- [ESLint one-var](https://eslint.org/docs/latest/rules/one-var): 선언 방식 선택. 이 프로젝트는 `never`를 사용한다.
- [ESLint curly](https://eslint.org/docs/latest/rules/curly): 제어문 중괄호 일관성.
- [React 규칙](https://react.dev/reference/rules): 컴포넌트·Hook의 실행 및 부수 효과 원칙.
- [simple-import-sort](https://github.com/lydell/eslint-plugin-simple-import-sort): import 그룹과 자동 정렬.
