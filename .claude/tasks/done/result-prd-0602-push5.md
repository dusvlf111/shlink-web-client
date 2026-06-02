# 결과보고서: tasks-prd-0602-push5.md

> 완료일: 2026-06-02
> Push 범위: 헤더 PocketBase admin 링크(§5) + 설정>방문 섹션 한글화(§7) (P1)

## 구현 요약
| 작업 | 상태 | 커밋 |
|------|------|------|
| 1.1 헤더 admin 전용 PocketBase 새 탭 링크 | ✅ | `5e89c6d1` |
| 2.1 설정>방문 섹션 i18n 패치 | ✅ | `9afab77d` |

## 생성/수정 파일
- `src/common/MainHeader.tsx` — `user?.role==='admin'` 가드 외부 링크(`<a target=_blank rel=noopener noreferrer>`), `POCKETBASE_ADMIN_URL` 모듈 상수, faDatabase 아이콘
- `src/i18n/locales/ko.ts`, `en.ts` — `header.pocketbaseAdmin`
- `scripts/patch-shlink-i18n.mjs` — 방문 섹션 매핑 4건 추가(아래)
- `test/common/MainHeader.test.tsx` — admin 노출/href/`target`/`rel` + 미노출 검증

## 추가한 i18n 매핑
1. "Exclude bots wherever possible (…server's version)." → "가능한 한 봇 제외 (이 옵션의 효과는 Shlink 서버 버전에 따라 다를 수 있습니다)." (U+2018 변형 커버)
2. excludeBots ternary `"excluded"/"included"` → "제외됩니다"/"포함됩니다"
3. loadPrevInterval ternary `"will"/"won't"` → "로드됩니다"/"로드되지 않습니다"
4. `" be loaded by default."` → " (기본값)."

## 테스트 결과
- `npx tsc --noEmit` — 통과
- `npx vitest run test/common/MainHeader.test.tsx` — 10 passed
- `npx eslint src/common/MainHeader.tsx` — 통과
- `node scripts/patch-shlink-i18n.mjs` — 멱등 확인(신규 매핑 재발화 없음), 빌드 산출물 한글 확인, 영어 잔존 0
- `npm run build` — 성공

## 이슈 및 특이사항
- ⚠️ i18n 패치는 `node_modules` 대상 → `npm install` 시 postinstall로 자동 재적용(멱등).
- playwright 육안 확인은 환경 미구성으로 빌드 산출물 grep으로 대체.
- `patch-shlink-i18n.mjs`의 기존 `console` no-undef ESLint 경고는 빌드 스크립트(린트 비대상), 무관.
- push 성공: `44caa8ad..9afab77d`.
