# Tasks: UTM 개선 - Push 1 (좌측 네비 통합 + 한국어 UI)

> PRD: `.claude/tasks/todo/prd-utm-improvement.md`
> Push 범위: UTM 메뉴를 좌측 사이드바로 이동, 하단 floating 버튼 정리, UI 영어 → 한국어
> 상태: 🔲 진행 중

---

## 에이전트 팀 구성

**팀 구성:** coordinator → developer + tester
**이유:** 라우팅·레이아웃·다수 페이지 동시 수정 + 기존 컴포넌트 연동 필요

### 실행 순서
1. **coordinator**: task 파일 읽고 작업 1.1 → 1.2 → 1.3 순으로 분배
2. **developer**: 각 하위 작업 구현 → 커밋 (5파일 미만 단위)
3. **tester**: 각 커밋 후 `npx tsc --noEmit` + `npm run build` 실행, 기존 UTM 테스트 회귀 확인
4. **coordinator**: 결과 취합 → 다음 작업 진행 또는 Push 완료 처리

### 역할별 지시사항
- **developer**: "참조 문서/이미지 먼저 읽고, '적용 규칙' 준수. 라우팅 변경 시 server scope/no-server scope 둘 다 검증. 한 커밋 = 한 하위 작업."
- **tester**: "타입체크 + 빌드 + 기존 UTM 테스트 4종(`test/utm/*.test.tsx`) 회귀 검증. UI 텍스트 변경 시 테스트 셀렉터 업데이트 필요한지 점검."

---

## 실행 환경 (팀 미사용 시)

- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent
- **이미지 읽기:** Read 도구로 .png/.jpg 파일 직접 열람 가능

---

## 참조 이미지

(이번 Push 관련 첨부 이미지 없음 — 코드만으로 구조 판단)

---

## 참조 문서

작업 시작 전 반드시 `Read`로 읽을 것:

| 문서 | 용도 |
|------|------|
| `.claude/tasks/0427.md` | 마케팅팀 원본 요청 (전 직역) |
| `.claude/tasks/todo/prd-utm-improvement.md` | 정리된 PRD |
| `src/app/App.tsx` | UTM 라우트/floating 버튼 정의 위치 |
| `src/common/ShlinkWebComponentContainer.tsx` | ShlinkSidebar + createNotFound 라우팅 |
| `src/common/MainHeader.tsx` | 상단 헤더 메뉴 (참고) |
| `src/common/NoMenuLayout.tsx` | 현재 UTM이 사용하는 레이아웃 |
| `src/utm/UtmManagementMenu.tsx` | 현재 상단 탭 바 (좌측 사이드바로 변경 대상) |

---

## 적용 규칙 (스킬 요약)

### 코드 품질 (`code-quality`)
- **가독성**: 라우팅 분기/레이아웃 분기 로직은 한 함수에 모아서 위→아래로 읽히게
- **예측 가능성**: 메뉴 항목 정의(`items` 배열)는 한 곳에 집중, 라벨/경로를 한눈에 파악 가능하게
- **응집도**: UTM 사이드바 메뉴는 `src/utm/` 안에 두고, 공용 레이아웃은 `src/common/`에 분리
- **결합도**: ShlinkWebComponent 내부 사이드바 API에 의존하지 말고, 자체 사이드바 레이아웃을 도입하여 외부 패키지 변경에 영향 받지 않게

### React 최적화 (`vercel-react-best-practices`)
- `items` 배열 같은 정적 메뉴 정의는 컴포넌트 외부로 호이스팅 (`rendering-hoist-jsx`)
- 페이지 라우트 매칭 함수(`isUtmRoute` 등)도 외부 호이스팅, useCallback 불필요
- 사이드바 활성 상태 표시는 `useLocation()` 결과를 `pathname`만 추출해 비교 (불필요한 리렌더 방지)

### 폴더 구조
- 신규 좌측 사이드바 레이아웃 = `src/common/` (다른 도메인이 재사용 가능하면) 또는 `src/utm/` (UTM 전용이면) 에 배치
- UTM 전용이면 `src/utm/UtmSidebarLayout.tsx` 권장

---

## 관련 파일

수정 대상:
- `src/app/App.tsx` — 라우팅, floating 버튼
- `src/utm/UtmManagementMenu.tsx` — 상단 탭 → 좌측 사이드바 스타일
- `src/utm/UtmBuilderPage.tsx` — 레이아웃 교체
- `src/utm/UtmBulkBuilderPage.tsx` — 레이아웃 교체
- `src/utm/UtmTemplateManager.tsx` — 레이아웃 교체
- `src/utm/UtmTagManager.tsx` — 레이아웃 교체

신규 생성 가능:
- `src/utm/UtmSidebarLayout.tsx` — 좌측 사이드바 + 본문 컨텐츠 슬롯 레이아웃 (선택)

테스트 영향:
- `test/utm/UtmBuilderPage.test.tsx`
- `test/utm/UtmBulkBuilderPage.test.tsx`
- `test/utm/UtmTemplateManager.test.tsx`
- `test/utm/UtmTagManager.test.tsx`

---

## 작업

- [ ] **1.0 UTM 좌측 사이드바 레이아웃 + 한국어 UI 정리 (Push 1)**

  - [ ] **1.1 UTM 좌측 사이드바 레이아웃 신설**
    **작업 상세:**
    - `src/utm/UtmSidebarLayout.tsx` 신규 생성 (또는 `UtmManagementMenu.tsx` 를 좌측 사이드바 형태로 리팩토링)
    - 좌측 고정폭 사이드바(예: `w-56`) + 우측 본문 영역 그리드 레이아웃
    - 사이드바에는 `빌더` / `벌크 생성` / `템플릿 관리` / `태그 관리` 4개 메뉴 표시
    - 활성 메뉴는 `bg-lm-main text-white` 강조 (기존 스타일 재활용)
    - 모바일(<md)에서는 상단 가로 탭으로 fallback (또는 collapsible)
    - 메뉴 항목 정의(`items` 배열)는 컴포넌트 외부로 호이스팅
    **참조:** `src/utm/UtmManagementMenu.tsx` (현재 스타일), `src/common/MainHeader.tsx` (NavBar 패턴)
    - [ ] 1.1.T1 테스트 코드 작성 (사이드바 렌더 + 활성 표시 + 4개 링크 존재)
    - [ ] 1.1.T2 `npm test src/utm` 실행 및 회귀 확인

  - [ ] **1.2 UTM 4개 페이지를 신규 레이아웃으로 교체**
    **작업 상세:**
    - `UtmBuilderPage.tsx`, `UtmBulkBuilderPage.tsx`, `UtmTemplateManager.tsx`, `UtmTagManager.tsx` 4개 파일에서:
      - `<NoMenuLayout>` → `<UtmSidebarLayout>` 으로 교체 (또는 동등 효과)
      - 기존 `<UtmManagementMenu />` 호출 제거 (사이드바로 대체됨)
    - 컨텐츠 영역의 max-width / padding은 그대로 유지
    **참조:** `src/utm/UtmBulkBuilderPage.tsx:301` (NoMenuLayout 사용 예)
    - [ ] 1.2.T1 각 페이지 테스트에서 `UtmManagementMenu` 가정 부분이 깨지지 않는지 검토
    - [ ] 1.2.T2 4개 테스트 실행: `npm test test/utm/`

  - [ ] **1.3 App.tsx 라우팅 / 하단 floating 버튼 정리**
    **작업 상세:**
    - 우측 하단 floating `UTM 관리` / `HOME` 버튼 제거 (App.tsx:108~120)
    - `MainHeader`에 `UTM 관리` 진입점 메뉴 추가 (혹은 좌측 사이드바를 통해서만 접근하도록 조정)
    - `isUtmRoute`, `floatingTarget`, `floatingLabel` 등 floating 버튼 관련 헬퍼 정리
    - UTM 라우트(server scope / no-server scope 양쪽) 그대로 유지하되, `isHome` 조건과의 충돌 없도록 검증
    **참조:** `src/app/App.tsx:29-58, 108-120`
    - [ ] 1.3.T1 라우팅 동작 수동 시나리오 메모 (홈 → UTM 빌더 진입 → 다른 UTM 메뉴 이동 → 홈 복귀)
    - [ ] 1.3.T2 `npm run build` + `npx tsc --noEmit` 통과 확인

  - [ ] **1.4 UI 영어 → 한국어 친화 라벨 정리**
    **작업 상세:**
    - 영어로 남아있는 라벨/버튼/안내문구 한국어로 통일
    - 점검 대상: `MainHeader.tsx`(`Settings` 등), `UtmBuilderPage.tsx`, `UtmBulkBuilderPage.tsx`, `UtmTemplateManager.tsx`, `UtmTagManager.tsx`
    - 메뉴/버튼 라벨은 마케팅팀 직관에 맞는 표현 사용 (예: `벌크 생성` → `여러 개 한번에 만들기` 같은 친숙한 대안 검토 후 채택)
    - 단, 단축링크 코어(ShlinkWebComponent 내부) 영어 텍스트는 외부 패키지이므로 변경 대상 아님
    **참조:** `grep -nE "Settings|Bulk|Builder|Template|Manager" src/utm src/common`
    - [ ] 1.4.T1 변경된 라벨 기준으로 테스트 셀렉터 업데이트 (`getByText` 매칭)
    - [ ] 1.4.T2 전체 테스트 회귀: `npm test`

---

## 완료 기준

- [ ] 좌측 사이드바에서 4개 UTM 메뉴 항목이 항상 보이고, 클릭 시 해당 페이지로 이동
- [ ] 우측 하단 floating UTM 관리 버튼이 사라지고, 진입점이 좌측 네비/헤더로 통일
- [ ] 영어 라벨이 사용자 마주하는 영역에서 사라짐 (외부 패키지 영역 제외)
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 성공
- [ ] `npm test test/utm` 통과
