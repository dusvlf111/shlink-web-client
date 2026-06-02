# 결과보고서: tasks-prd-0602-push2.md

> 완료일: 2026-06-02
> Push 범위: 서버 추가 PocketBase 일원화 — 로컬 fallback 제거, 실패 시 에러 노출 (P0)

## 구현 요약
| 작업 | 상태 | 커밋 |
|------|------|------|
| 1.1 saveNewServer를 PocketBase 성공 경로로 일원화 | ✅ | `bfcaab75` |

## 생성/수정 파일
- `src/servers/CreateServer.tsx` — 로컬 `ensureUniqueIds` fallback 제거. 비로그인 즉시 차단, PB 성공 시에만 PB id로 store 반영·navigate, 실패 시 임시 서버 없이 에러 표시(지역 `saveError` + `<Result variant="error">`)
- `src/i18n/locales/ko.ts`, `en.ts` — `servers.create.error.notLoggedIn`, `servers.create.error.saveFailed`
- `src/servers/reducers/remoteServers.ts` — eslint --fix import 정렬(로직 무변경)
- `test/servers/CreateServer.test.tsx` — PB 성공/실패/비로그인 케이스로 갱신

## 테스트 결과
- `npx vitest run test/servers/CreateServer.test.tsx` — 7 passed
- `npx tsc --noEmit` — 통과
- `npm run build` — 성공
- `npx eslint src/servers` — 통과

## 이슈 및 특이사항
- Prettier/ESLint quote 충돌 → eslint --fix 정정.
- 기존 "로컬 id 생성" 기대 테스트는 새 정책에 맞게 교체.
- 회귀 수동검증(playwright)은 미수행 — 자동 테스트로 대체. 운영 반영 전 도메인관리 메뉴 진입 육안 확인 권장.
- push 성공: `3f8ac843..bfcaab75`.
