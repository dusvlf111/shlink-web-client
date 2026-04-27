# 결과보고서: 0427-2 - Push 2 (UTM 템플릿/벌크 필수값 정책)

> 완료일: 2026-04-27
> 상태: ✅ 완료 — 코드 변경은 이전 푸시에서 누적 반영

## 구현 요약

| 작업 | 상태 | 반영 커밋 |
|------|------|-----------|
| 2.1 템플릿 데이터 구조 + 검증 규칙 (source/medium 필수, 나머지 optional) | ✅ | `a1efe7c0` (UtmTemplate 옵셔널 필드 + handleSave 검증) |
| 2.2 UTM 템플릿 관리 폼 UX (필수/선택 섹션 분리) | ✅ | `a1efe7c0` (REQUIRED_FIELDS / OPTIONAL_FIELDS 상수화 + 별도 섹션) |
| 2.3 벌크 생성 템플릿 선택 UX (campaign 빈 값 숨김 + tag description) | ✅ | `a1efe7c0` (`hasCampaign && \`· campaign=...\``, tag.description 노출) |
| 2.4 문구/도움말 + 회귀 테스트 | ✅ | `6b6652d1` (i18n ko/en 동기화) + 전체 회귀 통과 |

## 핵심 변경 파일

- `src/utm/useUtmData.ts` — `UtmTemplate.{campaign,term,content}?: string` 옵셔널화
- `src/utm/UtmTemplateManager.tsx` — `REQUIRED_FIELDS`/`OPTIONAL_FIELDS` 상수 + 섹션 분리 + 검증
- `src/utm/UtmBulkBuilderPage.tsx` — `pickOverride` 헬퍼, 빈 campaign 분기 렌더, tag description 노출
- `src/i18n/locales/{ko,en}.ts` — 새 정책에 맞춘 키 정리

## 테스트 결과

- 전체: 329 / 329 passed
- UTM: `test/utm/UtmTemplateManager.test.tsx` 13개 + `test/utm/UtmBulkBuilderPage.test.tsx` 16개

## 적용 규칙

- `code-quality` 가독성/응집도: REQUIRED/OPTIONAL 명시 상수 + 검증 로직 단일 위치
- `vercel-react-best-practices` `rendering-conditional-render`: 빈 campaign 시 UI 자체 미렌더
- `folder-structure`: 변경 모두 `src/utm/` 안에 한정

## 이슈/특이사항

- 사용자/linter 가 같은 영역을 별도 커밋(`a1efe7c0`) 에서 수정해 본 push 의 의도와 동기화됨
- `UtmTemplate.campaign?` 으로 옵셔널화한 직후 PocketBase 빈 문자열도 자연스럽게 호환
