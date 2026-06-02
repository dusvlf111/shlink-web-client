# Tasks: PRD-0602 - Push 4 — UTM 빌더 다중 링크 입력 (P1)

> PRD: `.claude/tasks/todo/prd-0602.md` (§6)
> Push 범위: UTM 빌더에 "다중 링크" 모드 추가(N URL × UTM 1세트), 빌더/벌크 역할 구분 부제
> 상태: 🔲 진행 중

---

### 에이전트 팀 구성

**팀 구성:** coordinator → developer + tester
**이유:** 기능 추가로 `UtmBuilderPage.tsx`의 상태/입력/빌드/출력/단축생성 핸들러를 다층 수정 + i18n + 회귀(단일 모드 보존) 검증이 필요하다.

#### 실행 순서
1. **coordinator**: PRD §6 명칭/역할표 기준으로 1.x→2.x 분배
2. **developer**: 단일/다중 토글 → 다중 파싱·빌드 → 출력/일괄 처리 순으로 구현·커밋
3. **tester**: 단일 모드 회귀 + 다중 모드 동작 테스트, 타입·빌드
4. **coordinator**: 취합

#### 역할별 지시사항
- **developer**: "기존 단일 입력 동작을 100% 보존(기본 모드). '다중 링크' 토글 시 textarea로 전환, 줄바꿈 split→trim→빈줄 제거→각 URL 검증. UTM 1세트를 각 URL에 적용해 결과 목록·일괄 복사·일괄 단축 생성. 모든 라벨/부제는 i18n 키로."
- **tester**: "단일 모드 결과가 기존과 동일한지(회귀) 우선 검증. 다중 모드: 유효/무효 URL 혼합 입력 시 무효는 건너뛰고 표시되는지."

### 실행 환경 (팀 미사용 시)
- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent
- **테스트:** `npx vitest run test/utm/UtmBuilderPage.test.tsx`

### 참조 문서

작업 시작 전 반드시 `Read`로 읽을 것:

| 문서 | 용도 |
|------|------|
| `.claude/tasks/todo/prd-0602.md` | §6 요구·명칭/역할표·해결 방향·인수 조건 |
| `src/utm/UtmBuilderPage.tsx` | 상태(`:14-21`), 입력(`:280-287`), `handleBaseUrlChange`(`:115-129`), `buildUtmUrl`(`:37-52`), 출력(`:304-315`), 단축생성(`:158-237`) |
| `src/utm/UtmBulkBuilderPage.tsx` | 다중 결과 목록·일괄 복사/단축 생성 UX 패턴 참고 |
| `src/utm/UtmFieldInput.tsx` | 필드 입력 컴포넌트 재사용 |
| `test/utm/UtmBuilderPage.test.tsx` | 기존 테스트 패턴 |

### 적용 규칙 (스킬 요약)

#### 명칭/문구 (PRD §6 확정 — 반드시 준수)
- UTM 빌더 부제: **"여러 링크에 같은 UTM 한 벌을 붙여 한 번에 생성"**
- UTM 벌크 생성 부제: **"한 링크에 저장된 여러 템플릿을 한 번에 적용"**
- 토글 라벨: **"단일 링크" / "다중 링크"** (기본=단일 링크)
- 다중 입력 라벨: **"기본 URL (여러 개는 줄바꿈으로 구분)"**
- 위 문자열은 모두 `src/i18n/locales/{ko,en}.ts` 키로 추가(하드코딩 금지).

#### 폴더 구조 (이 레포)
- `src/utm/` 내 수정. 새 화면/라우트 만들지 않음(기존 빌더에 모드 추가).

#### 코드 품질 (`code-quality`)
- **가독성**: 단일/다중 분기를 명확한 함수로 분리(`buildUtmUrls(urls, fields): {url, ok}[]`).
- **응집도**: URL 파싱·검증 유틸을 한 곳에.
- **결합도**: 출력/복사/단축생성은 "결과 배열"만 소비하게 통일(단일=길이1 배열로 일반화 가능).

#### React 최적화 (`vercel-react-best-practices`)
- `rerender-derived-state`: 결과 목록은 입력+UTM에서 `useMemo`로 파생(별도 상태 중복 보관 금지).
- `rerender-functional-setstate`, 정적 헬퍼는 컴포넌트 외부로 호이스팅(`rendering-hoist-jsx`).

### 관련 파일
- `src/utm/UtmBuilderPage.tsx` — 주요 수정
- `src/utm/UtmBulkBuilderPage.tsx` — 부제 1줄 추가
- `src/i18n/locales/ko.ts`, `src/i18n/locales/en.ts` — 부제/토글/라벨 키
- `test/utm/UtmBuilderPage.test.tsx` — 테스트

---

## 작업

- [x] 1.0 역할 구분 부제 추가 (PRD §6)
    - [x] 1.1 빌더/벌크 화면 상단 부제 + i18n 키
        **작업 상세:** `UtmBuilderPage`·`UtmBulkBuilderPage` 제목 아래 부제 1줄 추가. 문구는 PRD §6 확정안, i18n 키로.
        - [x] 1.1.T1 두 화면 렌더 시 부제 노출 테스트
        - [x] 1.1.T2 `npx tsc --noEmit` + `npx vitest run test/utm/` 통과

- [x] 2.0 UTM 빌더 다중 링크 모드 (PRD §6)
    - [x] 2.1 단일/다중 토글 + 입력 전환
        **작업 상세:** "단일 링크"(기본)=기존 `<input>` 그대로. "다중 링크"=textarea("여러 개는 줄바꿈으로 구분"). 모드 state 추가, 전환 시 입력 보존 또는 초기화 정책 명확히.
        - [x] 2.1.T1 토글 전환·기본 단일 모드 회귀 테스트
        - [x] 2.1.T2 `npx vitest run test/utm/UtmBuilderPage.test.tsx` 통과
    - [x] 2.2 다중 URL 파싱·빌드·결과 목록
        **작업 상세:** 줄 split→trim→빈줄 제거. 각 URL에 현재 UTM 1세트 적용(`buildUtmUrl` 재사용/`buildUtmUrls`로 일반화). 결과를 `{ url, builtUrl, ok }[]`로 `useMemo` 파생. 무효 URL은 결과에 "건너뜀" 표시.
        - [x] 2.2.T1 유효/무효 혼합 입력 → 유효만 빌드·무효 표시 테스트
        - [x] 2.2.T2 `npx vitest run test/utm/UtmBuilderPage.test.tsx` + `npx tsc --noEmit` 통과
    - [x] 2.3 일괄 복사 + 일괄 단축 URL 생성
        **작업 상세:** 결과 목록 전체 복사, 그리고 기존 단축생성 핸들러(`:158-237`)를 결과 배열 루프로 확장(단일=길이1). 진행/실패 표시.
        - [x] 2.3.T1 일괄 복사·일괄 생성(생성 API는 mock) 테스트
        - [x] 2.3.T2 `npx vitest run test/utm/` + `npx eslint src/utm` + `npm run build` 통과

---

### 완료 처리
- 통과 후 `.claude/tasks/done/`로 이동 + `result-prd-0602-push4.md` 작성.
- 회귀 핵심: **단일 링크 모드가 기존과 100% 동일**해야 함.
