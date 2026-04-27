# Tasks: UTM 개선 - Push 1 (통합 좌측 사이드바 + 한국어 UI)

> PRD: `.claude/tasks/todo/prd-utm-improvement.md`
> Push 범위: **방안 A** — 자체 통합 좌측 사이드바를 만들어 단축링크 5개 + UTM 4개 메뉴를 한 곳에 표시
> 상태: 🔲 진행 중

---

## 채택된 방안 (사전 조사 결과)

`@shlinkio/shlink-web-component@0.18.0` 의 좌측 사이드바(`fc` 컴포넌트, `node_modules/.../dist/index.js:291-329`) 는 **공개 API로 메뉴 항목 추가가 불가능함**.

→ **방안 A 채택**: 자체 통합 사이드바 컴포넌트(`UnifiedSidebar`)를 신설하여 외부 사이드바를 CSS로 숨기고, **단축링크 메뉴 5개 + UTM 메뉴 4개**를 단일 좌측 네비게이션에 노출.

### 외부 사이드바 메뉴 (그대로 미러링, 한국어 라벨)
| 경로 | 라벨 | 아이콘 |
|------|------|--------|
| `/overview` | 대시보드 | `faHouse` |
| `/list-short-urls/1` | 단축링크 목록 | `faList` |
| `/create-short-url` | 단축링크 만들기 | `faLink` (수평 flip) |
| `/manage-tags` | 태그 관리 | `faTags` |
| `/manage-domains` | 도메인 관리 | `faGlobe` |

### UTM 메뉴 (신규 영역, 구분선 아래)
| 경로 | 라벨 | 아이콘 |
|------|------|--------|
| `/utm-builder` | UTM 빌더 | `faWandMagicSparkles` |
| `/utm-bulk-builder` | UTM 벌크 생성 | `faLayerGroup` |
| `/utm-template-manager` | UTM 템플릿 관리 | `faClipboardList` |
| `/utm-tag-manager` | UTM 태그 관리 | `faTag` |

### 외부 사이드바 스타일 매칭 (조사 완료)
- `<aside className="w-(--aside-menu-width) bg-lm-primary dark:bg-dm-primary fixed bottom-0 top-(--header-height) z-890 ...">`
- 활성 항목: `text-white bg-lm-main dark:bg-dm-main`
- 모바일: `max-md:left-[calc(-1*(var(--aside-menu-width)+35px))]` (off-canvas)

---

## 에이전트 팀 구성

**팀 구성:** coordinator → developer + tester
**이유:** 외부 패키지 사이드바 숨김 + 자체 사이드바 신설 + 라우팅 전체 재구성, 다수 파일 동시 수정

### 실행 순서
1. **coordinator**: task 파일 읽고 작업 1.1 → 1.2 → 1.3 → 1.4 → 1.5 순으로 분배
2. **developer**: 각 하위 작업 구현 → 커밋 (5파일 미만)
3. **tester**: 각 커밋 후 `npx tsc --noEmit` + `npm run build` + `npm test test/utm` + 브라우저에서 사이드바 시각 검증
4. **coordinator**: 결과 취합 → 다음 작업 진행

### 역할별 지시사항
- **developer**: "외부 사이드바 라벨/경로/아이콘은 `node_modules/@shlinkio/shlink-web-component/dist/index.js:291-329` 와 정확히 동기화. 외부 사이드바 숨김은 글로벌 CSS 한 줄로 처리(셀렉터 충돌 주의). 한 커밋 = 한 하위 작업."
- **tester**: "타입체크 + 빌드 + UTM 4개 테스트 회귀 + 사이드바 9개 메뉴가 모든 페이지(단축링크/UTM/홈)에서 동일하게 보이는지, 활성 표시가 올바른지 수동 확인."

---

## 실행 환경 (팀 미사용 시)

- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent
- **이미지 읽기:** Read 도구로 .png/.jpg 파일 직접 열람 가능

---

## 참조 문서

작업 시작 전 반드시 `Read`로 읽을 것:

| 문서 | 용도 |
|------|------|
| `.claude/tasks/0427.md` | 마케팅팀 원본 요청 |
| `.claude/tasks/todo/prd-utm-improvement.md` | 정리된 PRD |
| `src/app/App.tsx` | UTM 라우트/floating 버튼 정의 위치 |
| `src/common/ShlinkWebComponentContainer.tsx` | ShlinkSidebar + createNotFound 라우팅 |
| `src/common/MainHeader.tsx` | 상단 헤더 (참고) |
| `src/common/NoMenuLayout.tsx` | 본문 컨테이너 — `ml-(--aside-menu-width)` 추가 대상 |
| `src/utm/UtmManagementMenu.tsx` | 기존 상단 탭 — Push 1 종료 시 제거 대상 |
| `node_modules/@shlinkio/shlink-web-component/dist/index.js` (라인 291-329) | 외부 사이드바 마크업/스타일 (참조용, 수정 불가) |

---

## 적용 규칙 (스킬 요약)

### 코드 품질 (`code-quality`)
- **가독성**: 메뉴 항목(`SHORT_URL_ITEMS`, `UTM_ITEMS`)은 컴포넌트 외부 상수로 정의, 위→아래 자연스러운 흐름
- **예측 가능성**: 활성 매칭 로직(`pathname.startsWith(item.match ?? item.to)`)을 단일 헬퍼로 추출
- **응집도**: `UnifiedSidebar` 한 곳에 모든 메뉴 정의 + 스타일 + 활성 매칭 모음
- **결합도**: 외부 패키지 내부 클래스명에 의존하는 CSS 셀렉터는 한 군데(글로벌 CSS)에만 두고, 향후 패키지 업데이트 시 한 군데만 수정

### React 최적화 (`vercel-react-best-practices`)
- `SHORT_URL_ITEMS` / `UTM_ITEMS` 정적 배열은 모듈 스코프에 호이스팅 (`rendering-hoist-jsx`)
- 활성 상태 비교는 `useLocation()` 의 `pathname` 만 추출해 단순 비교 (불필요한 객체 의존 회피)
- 사이드바는 `memo` 불필요 (자주 리렌더되지 않음, 단순 리스트)

### 폴더 구조
- 통합 사이드바는 단축링크/UTM 두 도메인을 모두 다루므로 `src/common/UnifiedSidebar.tsx` 에 배치
- UTM 전용 메뉴 항목 정의가 더 커지면 `src/utm/utmSidebarItems.ts` 로 분리 가능 (현재는 단일 파일에 두 배열로 시작)

---

## 관련 파일

신규 생성:
- `src/common/UnifiedSidebar.tsx` — 통합 좌측 사이드바
- `src/styles/hide-shlink-sidebar.css` 또는 기존 글로벌 CSS — 외부 사이드바 숨김

수정 대상:
- `src/app/App.tsx` — 통합 사이드바 항상 렌더, floating 버튼 제거, `<main>` 좌측 마진 추가
- `src/common/ShlinkWebComponentContainer.tsx` — `autoSidebarToggle={false}` 유지, `createNotFound` 에 template/tag 매니저 추가
- `src/common/NoMenuLayout.tsx` — 본문 영역 좌측 마진(`md:ml-(--aside-menu-width)`) 추가
- `src/utm/UtmBuilderPage.tsx` — `<UtmManagementMenu />` 제거 (사이드바로 대체)
- `src/utm/UtmBulkBuilderPage.tsx` — `<UtmManagementMenu />` 제거
- `src/utm/UtmTemplateManager.tsx` — `<UtmManagementMenu />` 제거
- `src/utm/UtmTagManager.tsx` — `<UtmManagementMenu />` 제거
- `src/common/MainHeader.tsx` — 영어 라벨 한국어 정리 (`Settings` → `설정`)

삭제 대상:
- `src/utm/UtmManagementMenu.tsx` — 더 이상 사용하지 않음

테스트 영향:
- `test/utm/UtmBuilderPage.test.tsx`
- `test/utm/UtmBulkBuilderPage.test.tsx`
- `test/utm/UtmTemplateManager.test.tsx`
- `test/utm/UtmTagManager.test.tsx`
- `test/common/MainHeader.test.tsx`
- 신규: `test/common/UnifiedSidebar.test.tsx`

---

## 작업

- [ ] **1.0 통합 좌측 사이드바 + 한국어 UI 정리 (Push 1)**

  - [ ] **1.1 `UnifiedSidebar` 컴포넌트 신설**
    **작업 상세:**
    - `src/common/UnifiedSidebar.tsx` 생성
    - 외부 사이드바와 동일한 컨테이너 클래스 그대로 사용:
      ```
      w-(--aside-menu-width) bg-lm-primary dark:bg-dm-primary
      pt-[15px] md:pt-[30px] pb-[10px]
      fixed bottom-0 top-(--header-height) z-890 transition-[left] duration-300
      shadow-aside-menu-mobile md:shadow-aside-menu
      ```
    - 모바일 토글: 기본은 데스크톱 노출만 우선 구현, 모바일은 `max-md:hidden` 으로 임시 처리 (Push 후속에서 토글 추가 가능)
    - 활성 항목 스타일: `text-white bg-lm-main dark:bg-dm-main`
    - 비활성 항목: `highlight:bg-lm-secondary highlight:dark:bg-dm-secondary`
    - 9개 메뉴 (단축링크 5 + 구분선 + UTM 4)
    - 단축링크 경로 prefix: serverId 있으면 `/server/${serverId}` 붙이고, 없으면 빈 문자열 (홈에서는 `/server/...` 가 없으므로 비활성 표시)
    - 구분선 위 라벨: `<small>UTM 도구</small>` (gray-500 텍스트)
    - 메뉴 항목 정의는 컴포넌트 외부 상수로 호이스팅
    **참조:** `node_modules/@shlinkio/shlink-web-component/dist/index.js:280-329` (마크업/스타일 그대로 차용)
    - [ ] 1.1.T1 `test/common/UnifiedSidebar.test.tsx` 작성 — 9개 링크 렌더 + 활성 클래스 적용 + serverId prefix 적용 검증
    - [ ] 1.1.T2 `npm test test/common/UnifiedSidebar.test.tsx` 통과

  - [ ] **1.2 외부 ShlinkSidebar 숨김 + 자체 사이드바 항상 렌더**
    **작업 상세:**
    - 글로벌 CSS(예: `src/index.css` 또는 `src/styles/global.css` 위치 확인) 에 외부 사이드바 숨김 추가:
      ```css
      /* @shlinkio/shlink-web-component 의 내부 사이드바 숨김 — UnifiedSidebar 로 대체 */
      .shlink-wrapper aside.bg-lm-primary { display: none !important; }
      ```
      (`data-testid="shlink-wrapper"` 가 App.tsx 에 이미 있음 → 안전한 컨테이너 셀렉터)
    - `App.tsx` 에서 `<MainHeader />` 직후, `<Routes>` 바깥에 `<UnifiedSidebar />` 항상 렌더
    - `<div data-testid="shlink-wrapper">` 의 자식 컨테이너에 `md:ml-(--aside-menu-width)` 추가하여 본문이 사이드바와 겹치지 않게
    - 단, `isHome` 조건에서는 사이드바 마진 적용 안 함 옵션 검토 (홈 화면이 가운데 정렬이라 마진이 필요 없을 수 있음 — 현장 시각 확인 후 결정)
    - `ShlinkSidebarToggleButton` 호출은 일단 제거 (자체 사이드바는 데스크톱 항상 노출 우선) — 모바일 토글은 후속
    **참조:** `src/app/App.tsx:65-104` 본문 구조, `src/common/ShlinkWebComponentContainer.tsx:53-74`
    - [ ] 1.2.T1 사이드바 항상 렌더 + 본문 마진 적용 통합 테스트
    - [ ] 1.2.T2 `npm run build` + `npx tsc --noEmit` 통과

  - [ ] **1.3 라우팅 정리 — UTM 페이지에서 통합 사이드바 자연스럽게**
    **작업 상세:**
    - `App.tsx` 의 UTM Routes (서버 scope / no-server scope 양쪽) 그대로 유지 — 통합 사이드바가 모든 페이지에 노출되므로 별도 처리 불필요
    - `ShlinkWebComponentContainer.tsx` 의 `createNotFound` 에 template-manager / tag-manager 분기 추가하여 server 진입 시 ShlinkWebComponent 내부에서도 처리되도록 일관성 확보 (선택 — App.tsx Routes 가 먼저 캐치하므로 실제로는 도달 안함)
    - `App.tsx`:
      - 우측 하단 floating `UTM 관리` / `HOME` 버튼 제거 (라인 108-120)
      - `isUtmRoute`, `floatingTarget`, `floatingLabel`, `getServerIdFromPathname` 중 사용처가 없어진 헬퍼 정리 (단, `getServerIdFromPathname` 은 `UnifiedSidebar` 가 prefix 산출에 필요할 수 있으므로 유지)
    **참조:** `src/app/App.tsx:29-58, 108-120`
    - [ ] 1.3.T1 라우팅 수동 시나리오 검증 메모 (홈 → UTM 빌더 → 단축링크 목록 → 태그 관리 → UTM 템플릿 → 홈 — 사이드바 활성 표시 일관)
    - [ ] 1.3.T2 `npm run build` + `npx tsc --noEmit` 통과

  - [ ] **1.4 UTM 페이지에서 `UtmManagementMenu` 제거**
    **작업 상세:**
    - 4개 UTM 페이지에서 `<UtmManagementMenu />` 호출 제거 (사이드바로 대체됨)
    - import 문 제거
    - `src/utm/UtmManagementMenu.tsx` 파일 삭제
    - 본문 헤더의 `<NoMenuLayout>` 또는 동등 컨테이너는 그대로 유지 (좌측 마진은 1.2 에서 글로벌 처리됨)
    **참조:** `src/utm/UtmBulkBuilderPage.tsx:11, 309`
    - [ ] 1.4.T1 4개 UTM 테스트에서 `UtmManagementMenu` 가정 부분 제거/수정
    - [ ] 1.4.T2 `npm test test/utm` 통과

  - [ ] **1.5 UI 영어 → 한국어 친화 라벨 정리**
    **작업 상세:**
    - `MainHeader.tsx`: `Settings` → `설정`
    - 외부 패키지(ShlinkWebComponent) 내부 텍스트는 변경 대상 아님
    - UTM 페이지 내 잔존 영어 라벨/플레이스홀더 점검 후 한국어로
    - 마케팅팀 친화 표현 검토:
      - `벌크 생성` → 그대로 두거나 `여러 개 한번에 만들기` 검토
      - placeholder `https://example.com/path` 는 그대로 (URL 예시는 명확)
    **참조:** `grep -nE 'Settings|Bulk|Builder|Template|Manager' src/utm src/common`
    - [ ] 1.5.T1 변경된 라벨 기준으로 테스트 셀렉터 업데이트 (`getByText`, `getByRole('link')`)
    - [ ] 1.5.T2 전체 회귀: `npm test`

---

## 완료 기준

- [ ] 모든 페이지(홈/단축링크/UTM)에서 동일한 좌측 사이드바가 노출됨
- [ ] 사이드바에 9개 메뉴(단축링크 5 + UTM 4)가 한국어 라벨로 표시되고, 현재 페이지 활성 표시 정확
- [ ] 외부 ShlinkWebComponent 의 내부 사이드바가 시각적으로 보이지 않음
- [ ] 우측 하단 floating UTM 관리 버튼이 사라짐
- [ ] UTM 페이지의 상단 가로 탭(`UtmManagementMenu`) 이 제거됨
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 성공
- [ ] `npm test test/utm` + `npm test test/common` 통과
- [ ] 브라우저(`npm start`)에서 사이드바 + 라우팅 동작 시각 확인

---

## 위험/주의사항

- **외부 패키지 메뉴 변경 위험**: `@shlinkio/shlink-web-component` 가 메이저 버전 업데이트하면서 5개 메뉴 라벨/경로/아이콘을 바꿀 가능성. → 패키지 잠금 또는 정기 점검 필요. 메뉴 정의 상수 위에 주석으로 "외부 패키지 0.18.0 기준" 명시.
- **CSS 셀렉터 충돌 위험**: `aside.bg-lm-primary` 셀렉터가 다른 곳에서 쓰일 가능성. → `[data-testid="shlink-wrapper"] aside.bg-lm-primary` 로 스코프 좁히기.
- **모바일 토글 누락**: 본 Push 에서는 데스크톱 우선. 모바일 사용성 후속 Push에서 보완.
