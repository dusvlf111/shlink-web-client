# 결과보고서: tasks-prd-0602-push1.md

> 완료일: 2026-06-02
> Push 범위: UTM 벌크 "전체 해제" 버그 + UTM 템플릿/태그 "수정→저장 미적용" 버그 (P0)

## 구현 요약

| 작업 | 상태 | 커밋 |
|------|------|------|
| 1.1 전체선택 effect를 useRef 최초 1회 부트스트랩으로 변경 | ✅ | `83d7e980` |
| 2.1 useUtmData update/delete 에러 표면화 + 소유권 보존 + 빈 필드 `''` | ✅ | `c2365407` |
| 2.2 UtmTemplateManager/UtmTagManager 정직한 성공·실패 표시 | ✅ | `3f8ac843` |

## 생성/수정 파일
- `src/utm/UtmBulkBuilderPage.tsx` — `useRef(didBootstrapSelection)` 가드, `selectedIds.length` 의존성 제거 → "전체 해제" 빈 상태 유지, 첫 진입 전체선택 보존
- `src/utm/useUtmData.ts` — update/delete try/catch + re-throw(`toUtmError`), update에서 `user` 재할당 제거, `normalizeTemplateForUpdate`로 빈 optional 필드를 `''` 전송
- `src/utm/UtmTemplateManager.tsx` — handleSave/handleDelete try/catch, 성공 resolve 후에만 메시지·리셋
- `src/utm/UtmTagManager.tsx` — 동일 패턴(validationError 상태 추가)
- `src/i18n/locales/ko.ts`, `en.ts` — 저장/수정/삭제 성공·실패 메시지 키 추가
- `test/utm/UtmBulkBuilderPage.test.tsx`, `test/utm/useUtmData.test.tsx`(신규), `test/utm/UtmTemplateManager.test.tsx` — 테스트 추가

## 테스트 결과
- `npx vitest run test/utm/` — 5개 파일, **55개 전부 통과**
- `npx tsc --noEmit` — 통과
- `npx eslint src/utm` — 통과

## 이슈 및 특이사항
- PostToolUse Prettier(double-quote)와 ESLint(single-quote) 충돌 → `eslint --fix`로 정정. 2.1 커밋이 잠시 double-quote를 담았고 2.2에서 single-quote로 정정 포함.
- DB 룰 변경 없음(PRD §2대로 — 이미 permissive 확정). 순수 클라이언트 수정.
- `git push -u origin feat/new-work-4335` 성공.
- ntfy 알림: 작업 1.1/2.1/2.2 + Push 1/5 완료 요약 전송.
