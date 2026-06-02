# Tasks: PRD-0602 - Push 1 — UTM 도구 버그 수정 (P0)

> PRD: `.claude/tasks/todo/prd-0602.md` (§1, §2)
> Push 범위: UTM 벌크 "전체 해제" 버그 + UTM 템플릿/태그 "수정→저장 미적용" 버그
> 상태: 🔲 진행 중

---

### 에이전트 팀 구성

**팀 구성:** coordinator → developer + tester
**이유:** 3개 파일 수정(`UtmBulkBuilderPage.tsx`, `useUtmData.ts`, `UtmTemplateManager.tsx`), 상태/effect 로직 + 데이터 훅 동시 변경으로 회귀 위험이 있어 구현과 검증을 분리한다.

#### 실행 순서
1. **coordinator**: 이 파일 + PRD §1,§2 읽고 1.x → 2.x 순으로 developer에 분배
2. **developer**: 각 커밋 단위 구현 → 커밋 → 보고
3. **tester**: 커밋마다 `npx tsc --noEmit` + 관련 vitest + `npx eslint` 실행, 실패 시 원인 보고
4. **coordinator**: 결과 취합 → 다음 커밋 또는 완료 처리

#### 역할별 지시사항
- **developer**: "참조 문서를 먼저 Read. PRD에 명시된 근본 원인대로만 최소 수정. UI 노출 문자열은 기존 `src/i18n/locales/{ko,en}.ts` 패턴을 따른다. 각 하위 작업 = 1커밋."
- **tester**: "developer 완료 후 `npx tsc --noEmit` → `npx vitest run test/utm/` → `npx eslint src/utm`. 기존 테스트가 깨지면 구현 문제인지 테스트 문제인지 구분해 보고."

### 실행 환경 (팀 미사용 시)
- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent (서브에이전트 중첩 불가)
- **테스트:** `npx vitest run test/utm/<파일>` / `npx tsc --noEmit`
- **병렬 작업:** 불가 (순차)

### 참조 문서

작업 시작 전 반드시 `Read`로 읽을 것:

| 문서 | 용도 |
|------|------|
| `.claude/tasks/todo/prd-0602.md` | §1(전체 해제), §2(수정→저장) 근본 원인·해결 방향·인수 조건 |
| `src/utm/useUtmData.ts` | 데이터 훅 (update/delete/normalize) — 수정 대상 |
| `src/utm/UtmBulkBuilderPage.tsx` | 전체 해제 effect (`:159-165`), `toggleAll`(`:187-189`) |
| `src/utm/UtmTemplateManager.tsx` | `handleSave`(`:36-76`), 삭제 호출부(`:347`) |
| `test/utm/UtmBulkBuilderPage.test.tsx`, `test/utm/UtmTemplateManager.test.tsx` | 기존 테스트 패턴 |

### 적용 규칙 (스킬 요약)

#### 이 레포의 폴더 구조 (⚠️ 역할문서의 FSD와 다름)
- 이 프로젝트는 **기능 평면 구조**: `src/utm/`, `src/servers/`, `src/settings/`, `src/common/`, `src/lib/` …
- ❌ role 문서(developer.md)의 `app/pages/widgets/features/entities/shared` FSD 계층은 **이 레포에 적용 안 됨**. 기존 `src/utm/` 안에서 수정한다.
- import alias: 이 레포는 상대경로(`../lib/pocketbase`)를 사용 (기존 코드 관례 유지).

#### 코드 품질 (`code-quality`)
- **가독성**: effect 의도가 드러나게(최초 1회 초기화임을 명확히).
- **예측 가능성**: 이름·반환만으로 동작 예측 — `updateTemplate`이 실패하면 throw가 호출부까지 전달돼야 함(삼키지 말 것).
- **응집도**: 에러 처리 로직을 데이터 훅(`useUtmData`)에 모은다.
- **결합도**: UI(`UtmTemplateManager`)는 훅의 성공/실패 결과만 보고 메시지를 결정.

#### React 최적화 (`vercel-react-best-practices`)
- `rerender-lazy-state-init` / effect 의존성: **불필요한 의존성(`selectedIds.length`) 제거** — 최초 부트스트랩은 `useRef` 가드로 1회만.
- 함수형 setState 유지(`setSelectedIds(prev => …)`).

### 관련 파일
- `src/utm/UtmBulkBuilderPage.tsx` — 전체 해제 effect (수정 대상)
- `src/utm/useUtmData.ts` — `updateTemplate`/`updateTag`/`deleteTemplate`/`deleteTag`/`normalizeTemplate` (수정 대상)
- `src/utm/UtmTemplateManager.tsx` — `handleSave` 성공/실패 표시 (수정 대상)
- `src/utm/UtmTagManager.tsx` — 태그 저장/삭제 동일 패턴 (참조/필요 시 수정)

---

## 작업

- [x] 1.0 UTM 벌크 "전체 해제" 버그 수정 (PRD §1)
    - [x] 1.1 자동 전체선택 effect를 "최초 1회 부트스트랩"으로 변경
        **작업 상세:** `UtmBulkBuilderPage.tsx:159-165`의 effect에서 의존성 `selectedIds.length` 제거. `useRef(false)` 같은 `didInit` 가드를 두어 `templates`가 처음 0→N으로 채워질 때만 1회 전체선택. 이후 사용자가 `toggleAll`로 비우면 빈 상태 유지. 첫 진입 UX(전체선택 시작)는 보존.
        **참조:** PRD §1 해결 방향
        - [x] 1.1.T1 `test/utm/UtmBulkBuilderPage.test.tsx`에 "전체 해제 클릭 후 빈 상태 유지" + "첫 진입 시 전체선택" 케이스 추가
        - [x] 1.1.T2 `npx vitest run test/utm/UtmBulkBuilderPage.test.tsx` + `npx tsc --noEmit` 통과 확인

- [x] 2.0 UTM 수정→저장 미적용 버그 수정 (PRD §2)
    - [x] 2.1 `useUtmData`의 update/delete에 에러 표면화 + 소유권 보존 + 빈 필드 처리
        **작업 상세:**
        1) `updateTemplate`/`updateTag`/`deleteTemplate`/`deleteTag`를 `try/catch`로 감싸 실패 시 throw를 **호출부로 전달**(삼키지 말 것). 성공/실패를 호출부가 알 수 있도록 반환 또는 throw 일관화.
        2) **소유권 보존**: `updateTemplate`/`updateTag`의 update 페이로드에서 `user: userId` **제거**(원 소유자 유지). (생성 시에는 `user` 유지)
        3) **빈 optional 필드 반영**: update 경로에서 `campaign/term/content`가 비면 `undefined`(JSON 누락) 대신 **`''`** 를 전송해 값 비우기가 PocketBase에 반영되게. `normalizeTemplate`을 건드릴 경우 create 경로 동작이 깨지지 않게 분리.
        **참조:** PRD §2 근본 원인 1·2·3·4, 해결 2·3·4. (DB 룰 변경 없음 — 이미 permissive 확정)
        - [x] 2.1.T1 `useUtmData` 동작 단위 테스트: update 시 `user` 미포함, 빈 필드 `''` 전송, 실패 시 reject 전파 (pb mock 활용 — 기존 테스트의 mock 패턴 따를 것)
        - [x] 2.1.T2 `npx vitest run test/utm/` + `npx tsc --noEmit` 통과 확인
    - [x] 2.2 `UtmTemplateManager.handleSave` 정직한 성공/실패 표시
        **작업 상세:** `handleSave`(`:62-68`)에서 `await updateTemplate(...)`/`saveTemplate(...)`를 `try/catch`로 감싸 **성공 후에만** `saveMsg` 설정·폼 리셋. 실패 시 `validationError`(또는 별도 에러 상태)에 원인 메시지 표시. 삭제 호출부(`:347`)도 `await` + 실패 메시지. `UtmTagManager`도 동일 패턴 적용.
        **참조:** PRD §2 해결 2
        - [x] 2.2.T1 `test/utm/UtmTemplateManager.test.tsx`: 수정 성공 시 메시지·반영, 실패(mock reject) 시 에러 메시지 노출 케이스 추가
        - [x] 2.2.T2 `npx vitest run test/utm/UtmTemplateManager.test.tsx test/utm/UtmTagManager.test.tsx` + `npx eslint src/utm` 통과 확인

---

### 완료 처리
- 모든 `[ ]` 통과 후 이 파일을 `.claude/tasks/done/`로 이동하고 `result-prd-0602-push1.md` 결과보고서 작성(구현 파일·커밋 해시·특이사항).
