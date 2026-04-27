# 결과보고서: UTM 개선 - Push 1 (통합 좌측 사이드바 + i18n)

> 완료일: 2026-04-27
> Push 범위: i18n 시스템 구축 + 통합 좌측 사이드바 + UTM 페이지 i18n 마이그레이션

## 구현 요약

| 작업 | 상태 | 커밋 |
| ---- | ---- | ---- |
| 1.0a i18n 기반 시스템 구축 | ✅ | `9291a90a` |
| 1.1 UnifiedSidebar 컴포넌트 신설 | ✅ | `6eb6576e` |
| 1.2 외부 ShlinkSidebar 숨김 + 자체 사이드바 항상 렌더 | ✅ | `6eb6576e` |
| 1.3 라우팅 정리 / floating UTM 버튼 제거 | ✅ | `6eb6576e` |
| 1.4 UTM 페이지에서 UtmManagementMenu 제거 | ✅ | `6eb6576e` |
| 1.5 UI 영어/한국어 → i18n 키 마이그레이션 (사이드바/헤더/페이지 제목) | ✅ | `6eb6576e` |
| 1.6 헤더 언어 토글 추가 | ✅ | `6eb6576e` |

## 신규 생성 파일

- `src/i18n/types.ts` — Locale, MessageKey, TranslateFn 타입
- `src/i18n/messages.ts` — locale → 메시지 dictionary 매핑
- `src/i18n/I18nContext.tsx` — Provider + useT() + useLocale() 훅
- `src/i18n/index.ts` — 공개 API
- `src/i18n/locales/ko.ts` — 한국어 (기본). koMessages 가 MessageKey 의 source-of-truth
- `src/i18n/locales/en.ts` — 영어 폴백. `Record<MessageKey, string>` 으로 키 누락 시 컴파일 에러
- `src/common/UnifiedSidebar.tsx` — 단축링크 5 + UTM 4 메뉴를 한 사이드바에 표시
- `test/i18n/I18nContext.test.tsx` — Provider/훅 단위 테스트 (5 케이스)
- `test/common/UnifiedSidebar.test.tsx` — 사이드바 렌더링/활성/locale 전환 (5 케이스)

## 수정 파일

- `src/index.tsx` — `<I18nProvider>` 최상위 래핑
- `src/app/App.tsx` — `<UnifiedSidebar />` 항상 렌더 + 본문 좌측 마진(`md:pl-(--aside-menu-width)`) + floating UTM 버튼 제거
- `src/common/MainHeader.tsx` — `useT()` 적용 + 언어 토글 버튼 (한국어 ↔ English) + a11y 위해 `<li role="none">` 래핑
- `src/tailwind.css` — `[data-testid="shlink-wrapper"] aside.bg-lm-primary { display: none !important; }` 로 외부 사이드바 숨김
- `src/utm/UtmBuilderPage.tsx` — 페이지 제목 i18n + UtmManagementMenu 호출 제거
- `src/utm/UtmBulkBuilderPage.tsx` — 페이지 제목 i18n + UtmManagementMenu 호출 제거
- `src/utm/UtmTagManager.tsx` — 페이지 제목 i18n + UtmManagementMenu 호출 제거
- `src/utm/UtmTemplateManager.tsx` — 페이지 제목 i18n + UtmManagementMenu 호출 제거

## 삭제 파일

- `src/utm/UtmManagementMenu.tsx` — 사이드바로 대체

## 테스트 결과

- 전체: 296 passed / 296 (Push 1 종료 시점)
- 신규: i18n 5 + UnifiedSidebar 5 = 10
- 회귀 수정: MainHeader 1 + App 2 + UTM 4 페이지 각 1

검증 명령:
- `npx tsc --noEmit` — 통과
- `npx vite build` — 통과
- `npx vitest run` — 296 passed

## 적용 규칙

- `code-quality`: 메뉴 정의 모듈 스코프 호이스팅, 한 파일 = 한 책임
- `vercel-react-best-practices`: `SHORT_URL_ITEMS`/`UTM_ITEMS` 정적 배열 호이스팅, locale 변경시 함수형 setState
- `folder-structure`: i18n 은 도메인 횡단 → `src/i18n/`, 사이드바는 두 도메인 공용 → `src/common/`

## 이슈 및 특이사항

1. **외부 패키지 사이드바 숨김 방식**: `@shlinkio/shlink-web-component@0.18.0` 가 사이드바 비활성 옵션을 노출하지 않아 CSS 셀렉터로 숨김 처리. `data-testid="shlink-wrapper"` 스코프로 한정해 다른 `aside` 영향 없음. 향후 패키지 메이저 업데이트 시 클래스명/구조 변경 가능성 점검 필요.
2. **a11y landmark uniqueness**: 두 개의 `<nav>` (헤더 + 사이드바) 가 동일 landmark 라 충돌. 사이드바 `<nav>` 에 `aria-label="단축 링크 / UTM 도구"` 부여로 해결.
3. **메뉴 동기화 위험**: 사이드바의 단축링크 5개 메뉴는 외부 패키지 내부 라우트(`/overview`, `/list-short-urls/1` 등)와 동일해야 동작. `UnifiedSidebar.tsx` 상단 주석으로 v0.18 기준임을 명시했고, 패키지 업데이트 시 비교 점검 필요.
4. **Playwright 브라우저 환경**: 컨테이너에 chromium 미설치 상태로 테스트 실행 시 `browserType.launch` 실패. `npx playwright install --with-deps chromium` 1회 실행으로 해결.
