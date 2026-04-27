# 결과보고서: 마케팅팀 후속 - Push 1 (사이드바 fallback)

> 완료일: 2026-04-27
> Push 범위: `UnifiedSidebar` 가 URL 에 serverId 가 없으면 redux 의 fallback 서버(autoConnect → 첫 번째) 사용

## 구현 요약

| 작업 | 상태 | 커밋 |
|------|------|------|
| 1.1 fallback 로직 + 테스트 | ✅ | `54db8a45` |

## 수정 파일

- `src/common/UnifiedSidebar.tsx` — `useServers()` import + `pickFallbackServerId` 헬퍼 + `effectiveServerId` 계산
- `test/common/UnifiedSidebar.test.tsx` — 신규 케이스 4 (fallback first server, autoConnect 우선, URL 우선, 비어있을 때 disabled)

## 테스트 결과

- 사이드바 테스트: 5 → 8 (3 신규)
- 전체: 303 / 303 passed

## 적용 규칙

- code-quality: fallback 우선순위(autoConnect → first → null) 를 단일 함수로 추출, 모듈 스코프
- vercel-react-best-practices: `useMemo` 로 servers map 변경 시에만 재계산

## 이슈/특이사항

- 운영 차단 버그였음 — 등록된 서버 1개만 있어도 모든 단축링크 메뉴가 회색이었음. fallback 도입으로 즉시 해결.
