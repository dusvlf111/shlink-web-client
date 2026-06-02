# Tasks: PRD-0602 - Push 2 — 서버 추가 PocketBase 일원화 (P0)

> PRD: `.claude/tasks/todo/prd-0602.md` (§4)
> Push 범위: 서버 추가 시 로컬 fallback 제거 → PocketBase 저장 성공만 반영, 실패 시 에러 노출
> 상태: 🔲 진행 중

---

### 에이전트 팀 구성

**팀 구성:** developer + tester (coordinator 선택)
**이유:** 핵심 수정은 1파일(`CreateServer.tsx`)이지만 서버 생성 플로우 변경이라 회귀 위험이 있어 tester 검증을 붙인다.

#### 실행 순서
1. **developer**: `CreateServer.tsx`의 이중 경로(fallback) 제거 구현 → 커밋
2. **tester**: `npx tsc --noEmit` + `npx vitest run test/servers/CreateServer.test.tsx` + 빌드. 실패 보고
3. (수정 필요 시) developer 재작업

#### 역할별 지시사항
- **developer**: "PRD §4 해결 방향대로 `saveNewServer`의 로컬 `ensureUniqueIds` fallback을 제거. PocketBase 저장 성공 시에만 Redux 반영·navigate. 실패/비로그인 시 임시 서버를 만들지 말고 에러 메시지 표시. UI 문자열은 `src/i18n/locales/{ko,en}.ts`에 키 추가."
- **tester**: "기존 `test/servers/CreateServer.test.tsx`가 fallback 동작을 기대하면 새 정책에 맞게 갱신. 타입·테스트·빌드 검증."

### 실행 환경 (팀 미사용 시)
- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent
- **테스트:** `npx vitest run test/servers/CreateServer.test.tsx` / `npx tsc --noEmit`

### 참조 문서

작업 시작 전 반드시 `Read`로 읽을 것:

| 문서 | 용도 |
|------|------|
| `.claude/tasks/todo/prd-0602.md` | §4 근본 원인·결정된 방향·인수 조건 |
| `src/servers/CreateServer.tsx` | `saveNewServer`(`:47-64`) — 수정 대상 |
| `src/servers/services/serverConfigsService.ts` | `createServerConfig`, `isPocketBaseLoggedIn` |
| `src/servers/reducers/remoteServers.ts` | `replaceServers` 동기화 맥락(`:38-58`) |
| `src/servers/helpers/index.ts` | `ensureUniqueIds`(제거 대상 경로) |
| `test/servers/CreateServer.test.tsx` | 기존 테스트(정책 변경 반영 필요) |

### 적용 규칙 (스킬 요약)

#### 폴더 구조 (이 레포 = 기능 평면 구조)
- `src/servers/` 안에서 수정. role 문서의 FSD 계층은 이 레포에 **미적용**.
- i18n 문자열은 `src/i18n/locales/ko.ts` / `en.ts`에 키 추가(하드코딩 금지).

#### 코드 품질 (`code-quality`)
- **예측 가능성**: "저장 실패 = 아무 일도 안 일어남"이 되지 않게 — 실패는 명확한 에러로.
- **결합도**: PocketBase 미로그인/실패 분기를 한 곳에서 처리.

#### React 최적화 (`vercel-react-best-practices`)
- `rerender-functional-setstate`, 에러 상태는 지역 `useState`로. 불필요한 리렌더 유발 금지.

### 관련 파일
- `src/servers/CreateServer.tsx` — 수정 대상
- `src/i18n/locales/ko.ts`, `src/i18n/locales/en.ts` — 에러/안내 문구 키 추가
- `test/servers/CreateServer.test.tsx` — 테스트 갱신

---

## 작업

- [x] 1.0 서버 생성 로컬 fallback 제거 (PRD §4)
    - [x] 1.1 `saveNewServer`를 PocketBase 성공 경로로 일원화
        **작업 상세:** `CreateServer.tsx:47-64`에서 `if (!saved) { ensureUniqueIds(...) }` 로컬 fallback 제거. 흐름: PocketBase 로그인 상태 확인 → `createServerConfig` 성공 시 그 결과(PB id)로 `createServers([saved])` + `navigate('/server/'+saved.id)`. 실패/비로그인 시 navigate 하지 말고 에러 상태 set + 사용자 메시지. (서버 추가는 admin 전용 라우트 유지 — 변경 없음)
        **참조:** PRD §4 결정된 방향·인수 조건
        - [x] 1.1.T1 `test/servers/CreateServer.test.tsx`: PB 성공 시 PB id로 navigate / PB 실패 시 임시 서버 미생성·에러 표시 / 비로그인 시 차단 케이스 갱신·추가
        - [x] 1.1.T2 `npx vitest run test/servers/CreateServer.test.tsx` + `npx tsc --noEmit` + `npm run build` 통과 확인

---

### 완료 처리
- 통과 후 `.claude/tasks/done/`로 이동 + `result-prd-0602-push2.md` 작성.
- ⚠️ 회귀 체크: 기존 등록 서버 목록(PocketBase) 진입·도메인 관리 메뉴 정상 동작 확인(가능하면 playwright로 수동 검증).
