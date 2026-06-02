# Tasks: PRD-0602 - Push 5 — 헤더 PocketBase 링크 + 설정>방문 한글화 (P1)

> PRD: `.claude/tasks/todo/prd-0602.md` (§5, §7)
> Push 범위: ① 헤더에 admin 전용 PocketBase 새 탭 링크 ② 설정>방문 섹션 미번역 한글화
> 상태: 🔲 진행 중
> 비고: 두 작업 모두 작고 독립적이라 한 Push로 묶음(서로 의존 없음).

---

### 에이전트 팀 구성

**팀 구성:** developer + tester
**이유:** React 컴포넌트 1곳(헤더) + 빌드 패치 스크립트 1곳으로 작고 독립적. coordinator 오버헤드 불필요. 단 i18n 패치 멱등성 검증은 tester가 담당.

#### 실행 순서
1. **developer**: 1.x(헤더 링크) → 2.x(i18n 패치) 순 구현·커밋
2. **tester**: 헤더 admin 노출/링크 + i18n 패치 후 빌드·멱등 검증
3. coordinator: 취합

#### 역할별 지시사항
- **developer**: "헤더는 언어 토글(`MainHeader.tsx:77-88`) 패턴 그대로 `<li><a target=_blank rel=noopener noreferrer>`. URL=`${import.meta.env.VITE_POCKETBASE_URL}/_/`. `user?.role==='admin'` 가드. 라벨은 `src/i18n/locales/{ko,en}.ts`. i18n 패치는 `scripts/patch-shlink-i18n.mjs`의 `REPLACEMENTS`에 정확한 번들 리터럴 추가(멱등)."
- **tester**: "패치 스크립트 실행(`node scripts/patch-shlink-i18n.mjs`) 후 번들에서 한글 확인, 재실행해도 깨지지 않는지(멱등) 확인. 헤더 admin/비admin 노출 테스트."

### 실행 환경 (팀 미사용 시)
- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent

### 참조 문서

작업 시작 전 반드시 `Read`로 읽을 것:

| 문서 | 용도 |
|------|------|
| `.claude/tasks/todo/prd-0602.md` | §5(헤더 링크), §7(한글화) 결정·인수 조건 |
| `src/common/MainHeader.tsx` | 메뉴 구조, 언어 토글 패턴(`:77-88`), admin 가드(`:59-76`) |
| `src/lib/pocketbase.ts` | `VITE_POCKETBASE_URL`(`:3`) |
| `src/i18n/locales/ko.ts`, `src/i18n/locales/en.ts` | 커스텀 UI 문자열 키 위치 |
| `scripts/patch-shlink-i18n.mjs` | `REPLACEMENTS` 배열 — 외부 패키지 한글화 패치 |

### 적용 규칙 (스킬 요약)

#### 한글화 대상 문자열 (PRD §7 — 번들에서 정확한 리터럴 확인 후 매핑)
- `"Exclude bots wherever possible (this option's effect might depend on Shlink server's version)."` → "가능한 한 봇 제외 (이 옵션의 효과는 Shlink 서버 버전에 따라 다를 수 있습니다)."
- "봇으로 추정되는 방문 포함" 토글 라벨 잔존 영어
- "이전 기간과 방문 비교"
- `"...won't be loaded by default."` (⚠️ JSX children으로 쪼개짐 — `node_modules/@shlinkio/shlink-web-component/dist/index-*.js`에서 실제 분할 리터럴 grep해 각각 매핑)

#### 코드 품질 (`code-quality`)
- **예측 가능성**: 헤더 링크는 내부 라우트(`NavBar.MenuItem`)가 아니라 외부 `<a>` — 혼동 없게 분리.
- i18n 하드코딩 금지(라벨/aria/title 포함).

#### 패치 멱등성
- `patch-shlink-i18n.mjs`는 `postinstall`에서 자동 실행되고 **재실행 안전**해야 함. 이미 한글인 경우 재치환되지 않도록(기존 스크립트의 "한→한 보정" 패턴 참고).

#### React 최적화
- 헤더 항목은 정적 — 불필요한 상태/리렌더 추가 금지.

### 관련 파일
- `src/common/MainHeader.tsx` — admin 전용 PocketBase 링크 추가
- `src/i18n/locales/ko.ts`, `src/i18n/locales/en.ts` — `header.pocketbaseAdmin` 등 키
- `scripts/patch-shlink-i18n.mjs` — 방문 섹션 한글 매핑 추가

---

## 작업

- [x] 1.0 헤더 PocketBase admin 링크 (PRD §5)
    - [x] 1.1 admin 전용 새 탭 외부 링크 추가
        **작업 상세:** `MainHeader.tsx`에 `user?.role==='admin'`일 때만 보이는 `<li role="none"><a href={`${import.meta.env.VITE_POCKETBASE_URL}/_/`} target="_blank" rel="noopener noreferrer" role="menuitem">`. 아이콘(예: faDatabase) + i18n 라벨. 언어 토글 마크업 패턴 재사용.
        **참조:** PRD §5
        - [x] 1.1.T1 `test/`에 헤더 테스트: admin 노출 + href에 `/_/` 포함, member/비로그인 미노출
        - [x] 1.1.T2 `npx tsc --noEmit` + 관련 vitest + `npx eslint src/common/MainHeader.tsx` 통과

- [x] 2.0 설정>방문 섹션 한글화 (PRD §7)
    - [x] 2.1 `patch-shlink-i18n.mjs`에 방문 섹션 매핑 추가
        **작업 상세:** 먼저 `grep -rn "be loaded by default\|wherever possible\|previous period" node_modules/@shlinkio/shlink-web-component/dist`로 **실제 번들 리터럴**을 확보. `REPLACEMENTS`에 영어→한글 매핑 추가. 쪼개진 문장은 분할 단위로 각각 매핑하되 한국어로 자연스럽게. 멱등 보장.
        **참조:** PRD §7 대상 문자열·주의
        - [x] 2.1.T1 `node scripts/patch-shlink-i18n.mjs` 실행 → 번들에서 한글 확인 + 재실행 멱등 확인(스크립트가 보고하는 치환 수가 2회차에 0/안정) — 6→2 안정(잔여 2는 기존 "User Agent" no-op), 신규 매핑은 재발화 안 함
        - [x] 2.1.T2 `npm run build` 통과 + (가능 시) playwright로 설정>방문 화면 한글 육안 확인 — build OK, 빌드 산출물에 한글 확인(playwright는 생략)

---

### 완료 처리
- 통과 후 `.claude/tasks/done/`로 이동 + `result-prd-0602-push5.md` 작성.
- ⚠️ i18n 패치는 `node_modules` 대상이라 **재설치 시 postinstall로 재적용**됨 — 결과보고서에 추가한 매핑 목록 기록.
