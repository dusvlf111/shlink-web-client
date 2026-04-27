# 결과보고서: 마케팅팀 후속 - Push 4 (모바일 UI/UX)

> 완료일: 2026-04-27
> Push 범위: 햄버거 토글 + 슬라이드 인 사이드바 + 백드롭 + 라우트 변경 시 자동 닫힘

## 구현 요약

| 작업 | 상태 | 커밋 |
|------|------|------|
| 4.1 `UnifiedSidebar` 슬라이드 토글 + 백드롭 + 라우트 변경 자동 닫힘 | ✅ | `a00a3701` |
| 4.2 `MainHeader` 햄버거 버튼 + onMenuClick prop | ✅ | `a00a3701` |
| 4.3 `App.tsx` visibility state + 본문 패딩 점검 | ✅ | `a00a3701` |

## 수정 파일

- `src/common/UnifiedSidebar.tsx` — `UnifiedSidebarProps { isOpen?, onClose? }` + 백드롭 `<button>` + `transition-transform duration-300` + `isOpen ? translate-x-0 : max-md:-translate-x-full` + `useEffect` 로 pathname 변경 시 자동 닫힘
- `src/common/MainHeader.tsx` — `MainHeaderProps { onMenuClick? }` + `<FontAwesomeIcon icon={faBars} />` 햄버거 버튼 (`md:hidden`)
- `src/app/App.tsx` — `useState<boolean>` + `openMobileSidebar` / `closeMobileSidebar` 콜백 + 두 컴포넌트에 prop 주입
- `src/i18n/locales/ko.ts`, `en.ts` — `header.openSidebar`, `header.closeSidebar` 키
- `test/common/UnifiedSidebar.test.tsx` — 신규 2 케이스 (백드롭 토글, data-mobile-open 속성)

## 테스트 결과

- 전체: 309 / 309 passed
- 사이드바 테스트: 8 → 10

## 적용 규칙

- code-quality: visibility state 는 App 에 한 번 두고 props 로 흘려보냄 (Context 까진 불필요한 복잡도)
- vercel-react-best-practices: `useCallback` 으로 open/close 핸들러 안정화, 라우트 변경 추적은 `useRef` 로 이전 값 비교
- 외부 패키지(@shlinkio/shlink-web-component) 의 off-canvas 트릭 동일 패턴 채용 — 데스크톱은 `md:translate-x-0` 으로 항상 노출

## 이슈/특이사항

1. **포커스 트랩 미구현**: 사이드바 열린 상태에서 Tab 으로 사이드바 외부로 빠져나갈 수 있음. UX 단순성 우선 + 빠르게 닫힘이 가능해 본 push 에서는 trade-off 수용
2. **ESC 키 닫기**: 미구현 — 후속 개선 가능
3. **자동 닫힘 트리거**: 메뉴 링크 클릭 시 `useEffect` 가 `pathname` 변경을 감지해 닫힘. 동일 라우트로 클릭하는 경우는 닫히지 않음 (문제 안 됨)
4. **본문 좌측 패딩**: `md:pl-(--aside-menu-width)` 가 데스크톱 한정 — 모바일 본문은 사이드바 영역만큼 안 잘림. backdrop 으로 사이드바 영역 시각 분리

## 마케팅팀 확인 요청

- 햄버거 위치(좌측 상단 brand 옆) 및 아이콘이 직관적인지
- 슬라이드 애니메이션 속도(300ms) 가 적당한지
