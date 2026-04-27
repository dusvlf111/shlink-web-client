# Tasks: 마케팅팀 후속 - Push 4 (모바일 UI/UX 최적화)

> PRD: `.claude/tasks/todo/prd-2026-04-27.md`
> Push 범위: 통합 사이드바 모바일 햄버거 토글, 헤더 반응형 점검, 본문 좌측 마진 모바일 0
> 상태: 🔲 대기 (Push 1 완료 후 진행 권장 — Push 1 의 사이드바 코드 위에서 작업)

---

## 에이전트 팀 구성

**팀 구성:** coordinator → developer + tester
**이유:** 사이드바/헤더/레이아웃 동시 변경, 다중 viewport 검증 필요

#### 실행 순서
1. **coordinator**: 작업 4.1 → 4.2 → 4.3 분배
2. **developer**: 각 단계 별도 커밋
3. **tester**: 데스크톱 + 모바일(<768px) viewport 회귀

#### 역할별 지시사항
- **developer**: "햄버거 토글 클릭으로 사이드바 슬라이드 인/아웃. backdrop 클릭/링크 클릭 시 자동 닫힘. focus trap 까진 안 해도 됨 (단순 슬라이드)."
- **tester**: "모바일 viewport 시뮬레이션으로 토글/링크/닫힘 동작 검증."

---

## 실행 환경

- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent
- **이미지 읽기:** Read 도구로 .png/.jpg 파일 직접 열람 가능

---

## 참조 문서

| 문서 | 용도 |
|------|------|
| `src/common/UnifiedSidebar.tsx` | `max-md:hidden` 제거 + 슬라이드 인 클래스 |
| `src/common/MainHeader.tsx` | 햄버거 버튼 위치, 모바일 메뉴 토글 (NavBar 컴포넌트가 이미 모바일 토글 가짐) |
| `src/app/App.tsx` | 본문 좌측 마진 (`md:pl-(--aside-menu-width)`) 그대로 두되, 사이드바 본인은 모바일에서 fixed off-canvas |
| 외부 사이드바 패턴 | `node_modules/@shlinkio/shlink-web-component/dist/index.js:299-303` (`max-md:left-[calc(...)]` off-canvas 트릭) |

---

## 적용 규칙 (스킬 요약)

### 코드 품질
- **응집도**: 사이드바 visibility 상태(`isOpen`) 는 `UnifiedSidebar` 안에 두거나, App 레벨 Context 로 끌어올리기 — 햄버거 위치에 따라 결정
- **예측 가능성**: open 상태가 모바일에서만 의미 있고 데스크톱에서는 무관 → 클래스 분기 시 `md:!translate-x-0` 같은 패턴

### React 최적화
- visibility context 가 작아서 `useState` 한 번이면 충분, Context 까진 불필요할 수도
- 햄버거 버튼은 모바일에서만 노출 (`md:hidden`)

### Tailwind / 반응형
- 모바일 사이드바: `fixed top-(--header-height) bottom-0 left-0 w-(--aside-menu-width)` + `transition-transform`
- 닫힌 상태: `-translate-x-full`, 열린 상태: `translate-x-0`
- 데스크톱: `md:translate-x-0` 강제 노출
- backdrop: `fixed inset-0 bg-black/40 z-880 md:hidden`, 사이드바 `z-890`

---

## 관련 파일

수정 대상:
- `src/common/UnifiedSidebar.tsx` — 모바일 슬라이드 + backdrop + 햄버거 통합
- `src/common/MainHeader.tsx` — 햄버거 버튼 (모바일 한정) 추가
- `src/app/App.tsx` — 사이드바 visibility 상태가 위로 올라간다면 여기에서 관리

테스트 영향:
- `test/common/UnifiedSidebar.test.tsx` — 토글 동작 케이스
- `test/common/MainHeader.test.tsx` — 햄버거 버튼 케이스

---

## 작업

- [ ] **4.0 모바일 UI/UX 최적화 (Push 4)**

  - [ ] **4.1 햄버거 토글 + 슬라이드 사이드바**
    **작업 상세:**
    - `UnifiedSidebar` 외부 export 시그니처: `(props: { isOpen?: boolean; onClose?: () => void })` (선택), 또는 자체 내부 state — 후자 권장 (단순)
    - `useState(false)` 로 `isOpen`, `MainHeader` 의 햄버거 클릭이 이 state 를 토글하려면 Context 필요
    - 결정: `App.tsx` 에 `useState(false)` + `<MobileSidebarContext.Provider>` 또는 그냥 두 컴포넌트 모두 `useState(localStorage)` 동기화 — 가장 단순한 안:
      - `App.tsx`: `const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)` 후 `<MainHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />` `<UnifiedSidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />`
    - `UnifiedSidebar` 클래스:
      ```
      max-md:transition-transform max-md:duration-300
      max-md:-translate-x-full
      data-[mobile-open=true]:max-md:translate-x-0
      ```
      (data attr 로 토글)
    - 라우트 변경 시 자동 닫힘: `useLocation()` 의 pathname 이 바뀌면 `onClose()`
    - backdrop: 별도 div 또는 `<aside>` 옆 형제로 렌더
    **참조:** `node_modules/.../dist/index.js:299-303`
    - [ ] 4.1.T1 모바일 viewport 햄버거 클릭 → 사이드바 노출 → 백드롭 클릭 → 닫힘 → 메뉴 클릭 → 닫힘
    - [ ] 4.1.T2 데스크톱 viewport 항상 노출, 햄버거 미노출
    - [ ] 4.1.T3 `npm test test/common`

  - [ ] **4.2 `MainHeader` 햄버거 버튼 추가**
    **작업 상세:**
    - `MainHeader` 좌측 brand 옆 (또는 brand 앞) 에 `md:hidden` 햄버거 아이콘 버튼
    - `faBars` (이미 import 됨)
    - aria-label: `t('header.openSidebar')` (신규 키)
    - props 로 `onMenuClick` 받음 (App 에서 주입)
    **참조:** `src/common/MainHeader.tsx`
    - [ ] 4.2.T1 모바일에서 버튼 노출 + onClick 호출 검증
    - [ ] 4.2.T2 a11y aria-label 검증

  - [ ] **4.3 본문 모바일 패딩/여백 점검**
    **작업 상세:**
    - `App.tsx` 의 본문 wrapper `md:pl-(--aside-menu-width)` 가 이미 데스크톱 한정 — OK
    - `<NoMenuLayout>` 의 모바일 padding (`max-md:p-3`) 도 OK
    - `Home.tsx` `px-3` 도 OK
    - 만약 사이드바가 모바일에서 떠있을 때 본문이 가려지는 경우는 backdrop 으로 처리됨 — 추가 작업 없음
    - 헤더 모바일 메뉴(NavBar 자체) 가 햄버거와 충돌하지 않는지 점검 필요 (NavBar 는 별도 자체 햄버거가 있을 수 있음)
    - [ ] 4.3.T1 모바일 viewport 회귀 검증
    - [ ] 4.3.T2 `npm run build` 통과

---

## 완료 기준

- [ ] 모바일(<768px) 에서 햄버거 클릭 시 사이드바가 좌측에서 슬라이드 인
- [ ] 메뉴 링크 클릭 또는 backdrop 클릭으로 자동 닫힘
- [ ] 데스크톱(≥768px) 에서는 햄버거 미노출, 사이드바 항상 표시 (회귀 없음)
- [ ] 본문이 모바일에서 사이드바 영역만큼 잘리지 않음 (좌측 패딩 0)
- [ ] `npx tsc --noEmit` + `npx vite build` 통과
- [ ] 모바일/데스크톱 양쪽 viewport 테스트 회귀 없음
