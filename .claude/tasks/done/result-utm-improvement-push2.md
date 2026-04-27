# 결과보고서: UTM 개선 - Push 2 (벌크 생성 즉석 입력 + 풀 i18n)

> 완료일: 2026-04-27
> Push 범위: 벌크 빌더 campaign/term/content 오버라이드 + UtmBulkBuilderPage 모든 라벨 i18n

## 구현 요약

| 작업 | 상태 | 커밋 |
| ---- | ---- | ---- |
| 2.1 공통 오버라이드 입력 필드 UI 추가 | ✅ | `3ad6f4b4` |
| 2.2 buildUtmUrlFromTemplate 시그니처 확장 + previewRows 의존성 갱신 | ✅ | `3ad6f4b4` |

## 핵심 변경

### `buildUtmUrlFromTemplate` 시그니처 확장
```ts
buildUtmUrlFromTemplate(
  baseUrl: string,
  template: UtmTemplateFields,
  overrides?: Partial<OverrideFields>,
): string
```
- `pickOverride(overrideValue, templateValue)` — overrides 가 비어있으면 template, truthy 하면 override 사용
- `utm_source`/`utm_medium` 은 채널 정보로 보고 오버라이드 대상 제외 (PRD 의도)

### 새 UI 섹션 (단계 1.5)
- 1단계 URL 입력 ↔ 2단계 템플릿 선택 사이 `1.5 이번 캠페인 정보 (선택)` 섹션
- 3개 입력 필드 (campaign / term / content) — 데스크톱 3열, 모바일 1열
- 입력값 변경 시 기존 결과 자동 초기화 (`useEffect` 의존성에 `overrideFields` 추가)
- 안내 문구: `비워두면 템플릿에 저장된 값이 그대로 사용됩니다. 입력하면 모든 선택 템플릿에 일괄 적용됩니다.`

### i18n 마이그레이션
- 메시지 키 ~50개 신규 (`utm.bulk.*`)
- 모든 사용자 가시 텍스트 → `t('...')` 호출
- 동적 메시지 → 파라미터 치환 사용 (예: `t('utm.bulk.message.generated', { count })`)

## 수정 파일

- `src/utm/UtmBulkBuilderPage.tsx` — 본문 i18n 풀 마이그레이션 + override 섹션 + buildUtmUrlFromTemplate 확장
- `test/utm/UtmBulkBuilderPage.test.tsx` — i18n 라벨 매칭 + 신규 4 케이스 (override 동작/회귀/locale)

## 테스트 결과

- `test/utm/UtmBulkBuilderPage.test.tsx`: 11 → 15 passed (4 케이스 신규)
- 전체: 300 passed / 300

신규 시나리오:
1. 오버라이드 빈 값 → 템플릿 campaign 그대로 적용
2. 모든 오버라이드 입력 → 모든 선택 템플릿이 동일한 campaign/term/content 사용 + 원래 템플릿 값(`spring`)은 결과에 없음
3. 오버라이드 입력 시 기존 generatedRows 자동 초기화
4. en locale 에서 영문 라벨 매칭 (`UTM bulk builder`, `Build`, `Campaign (utm_campaign)`)

검증 명령:
- `npx tsc --noEmit` — 통과
- `npx vite build` — 통과
- `npx vitest run` — 300 passed

## 적용 규칙

- `code-quality`: `pickOverride` 헬퍼로 오버라이드 우선순위 로직 단일 함수화. `OverrideFields` 타입 모듈 스코프
- `vercel-react-best-practices`: `setOverrideFields((prev) => ({ ...prev, ...patch }))` 함수형 setState 패턴, `useMemo` 의존성에 `overrideFields` 추가
- 외부 라이브러리 의존 없는 자체 i18n 활용

## 이슈 및 특이사항

1. **`getByText(/utm_campaign=spring/)` 매칭 이슈**: 첫 시도에 실패. URL 전체가 한 텍스트 노드로 렌더되어도 정규식이 일치하긴 하지만 단일 매치라 `getByText`가 여러 후보를 만나면 실패할 수 있음. `getAllByText`로 변경 후 통과.
2. **PRD 단어 통일**: 마케팅팀 친화 라벨로 `생성하기` → `만들기`, `단축링크 생성 중...` → `단축링크 만드는 중...` 으로 정리. 테스트도 동일하게 업데이트.
3. **시그니처 호환성**: `buildUtmUrlFromTemplate` 의 `overrides` 인자가 옵셔널이라 다른 호출자에 영향 없음. 본 파일 내 `previewRows` 만 변경.

## 마케팅팀 확인 요청

- `1.5 이번 캠페인 정보 (선택)` 명칭이 직관적인지 (대안: `이번 회차 캠페인`, `캠페인 정보 입력`)
- 오버라이드 영문 라벨 `Campaign info for this run (optional)` 적합 여부
- `만들기` 라벨이 실제 사용자 멘탈 모델과 맞는지 (대안: `생성`, `만들어주세요`)
