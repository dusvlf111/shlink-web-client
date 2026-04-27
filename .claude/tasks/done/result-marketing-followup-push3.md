# 결과보고서: 마케팅팀 후속 - Push 3 (사용자 관리 승인 대기 배지)

> 완료일: 2026-04-27
> Push 범위: `MainHeader` 의 `사용자 관리` 메뉴 우상단에 `status: 'pending'` 카운트 배지

## 구현 요약

| 작업 | 상태 | 커밋 |
|------|------|------|
| 3.1 `usePendingUsersCount` 훅 신설 | ✅ | `2eae2fed` |
| 3.2 MainHeader 배지 적용 + i18n 키 | ✅ | `2eae2fed` |

## 신규 파일

- `src/admin/usePendingUsersCount.ts`
  - admin 일 때만 `pb.collection('users').getList(1, 1, { filter: 'status="pending"', fields: 'id' })` 호출
  - 비 admin / 에러 시 0 반환
  - `{ count, refetch }` 반환 — UserManagementPage 에서 상태 변경 후 호출 가능
- `test/admin/usePendingUsersCount.test.tsx`
  - 4 케이스: non-admin / 비로그인 / admin (totalItems 7) / API 실패 (0 fallback)

## 수정 파일

- `src/common/MainHeader.tsx` — `usePendingUsersCount` 호출 + 배지 span (count > 0 일 때만)
- `src/i18n/locales/ko.ts`, `en.ts` — `header.userManagement.pendingBadge` 키 추가

## 테스트 결과

- 전체: 307 / 307 passed
- 신규 4 케이스 모두 통과

## 적용 규칙

- code-quality: 훅 단일 파일, `{ count, refetch }` 단순 반환
- vercel-react-best-practices: `count > 0 && <Badge />` 조건부 렌더, useCallback 의존성 정확히

## 이슈/특이사항

1. PocketBase `getList(1, 1, ...)` 트릭으로 `totalItems` 만 가져오면 비용 최소
2. 현재는 마운트 시 1회 fetch 만 — 사용자 관리 페이지에서 상태 변경 후 reload 하지 않으면 stale. 후속 push 에서 PocketBase realtime 또는 페이지 액션 후 invalidate 콜백 노출 검토 가능
3. role !== admin 사용자는 메뉴 자체가 안 보이므로 배지도 노출되지 않음 (회귀 없음)
