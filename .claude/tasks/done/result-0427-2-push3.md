# 결과보고서: 0427-2 - Push 3 (헤더 레이아웃 + 한글화 보완)

> 완료일: 2026-04-27
> 상태: ✅ 완료 — 코드 변경은 이전 푸시에서 누적 반영

## 구현 요약

| 작업 | 상태 | 반영 커밋 |
|------|------|-----------|
| 3.1 헤더 서버 라벨 세로 배치 버그 수정 | ✅ | `2eae2fed` / `a00a3701` (NavBar.MenuItem `whitespace-nowrap` + brand `flex items-center gap-2`) |
| 3.2 미완 한글화 키 보완 (사이드바/헤더/UTM/server CRUD) | ✅ | `9291a90a` + `6eb6576e` + `6b6652d1` (i18n 시스템 + 전 영역 한글화) |
| 3.3 회귀 검증 및 마무리 | ✅ | `npx tsc --noEmit` + `npx vite build` + `npx vitest run` 통과 |

## 핵심 변경 파일

- `src/common/MainHeader.tsx` — 햄버거 + 서버 드롭다운 + 언어 토글 + 사용자 관리 배지 모두 `whitespace-nowrap` + `flex` 정렬
- `src/servers/ServersDropdown.tsx` — 서버/관리/추가 모두 i18n 키
- `src/common/UnifiedSidebar.tsx` — 단축링크 5 + UTM 4 + 공유 1 메뉴 모두 i18n 키
- `src/i18n/locales/{ko,en}.ts` — 모든 사용자 가시 문자열 한글화 + 영문 폴백

## 테스트 결과

- 전체: 329 / 329 passed
- 영향 테스트: `MainHeader`, `UnifiedSidebar`, `ServersDropdown`, `App`, `ManageServersRowDropdown` 등 ko 라벨로 일제히 갱신됨

## 적용 규칙

- `code-quality` 예측 가능성: 라벨 변경은 i18n 키 한 군데에서만
- `folder-structure`: 헤더/사이드바는 `src/common/`, 서버 컴포넌트는 `src/servers/`
- 외부 패키지(@shlinkio/shlink-web-component) 의 영문 라벨은 변경 대상 아님 (스킬 규칙 따름)

## 남은 이슈

- 외부 패키지 내부의 'Search...' / 'Connect' 등 일부 텍스트는 패키지가 직접 렌더하므로 본 push 범위 밖
