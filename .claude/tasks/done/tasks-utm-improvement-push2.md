# Tasks: UTM 개선 - Push 2 (벌크 생성 즉석 입력 + i18n 적용)

> PRD: `.claude/tasks/todo/prd-utm-improvement.md`
> Push 범위: 벌크 빌더에 campaign/term/content 공통 입력 필드 추가, 템플릿값 오버라이드, **모든 신규 라벨은 i18n 키로 정의**
> 상태: 🔲 대기 중 (Push 1 완료 후 진행)
>
> **선행 조건:** Push 1 에서 `src/i18n/` 시스템 + `useT()` 훅이 구축되어 있어야 함.

---

## 에이전트 팀 구성

**팀 구성:** developer + tester (coordinator 없이)
**이유:** 단일 페이지(`UtmBulkBuilderPage`) + 단일 헬퍼(`buildUtmUrlFromTemplate`) 수정으로 범위가 좁음

### 실행 순서
1. **developer**: 작업 2.1 → 2.2 순으로 구현 + 커밋
2. **tester**: `npm test test/utm/UtmBulkBuilderPage.test.tsx` + `npx tsc --noEmit`
3. 실패 시 developer 재진입 → 수정 → 재검증

### 역할별 지시사항
- **developer**: "오버라이드 우선순위 명확히 — 입력 필드 값이 있으면 템플릿 값을 덮어쓰고, 비어있으면 템플릿 값 유지. 빈 문자열 trim 처리 일관."
- **tester**: "템플릿 + 오버라이드 조합별 URL 결과 단위 테스트 추가, 단축링크 생성 호출에도 오버라이드값이 반영되는지 검증."

---

## 실행 환경 (팀 미사용 시)

- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent
- **이미지 읽기:** Read 도구로 .png/.jpg 파일 직접 열람 가능

---

## 참조 이미지

(이번 Push 관련 첨부 이미지 없음)

---

## 참조 문서

작업 시작 전 반드시 `Read`로 읽을 것:

| 문서 | 용도 |
|------|------|
| `.claude/tasks/0427.md` | 마케팅팀 원본 요청 (campaign 예시 포함) |
| `.claude/tasks/todo/prd-utm-improvement.md` | 요구사항 정리 |
| `src/utm/UtmBulkBuilderPage.tsx` | 메인 수정 대상 |
| `src/utm/useUtmData.ts` | UtmTemplate 타입 (변경 없음, 참조용) |
| `test/utm/UtmBulkBuilderPage.test.tsx` | 기존 테스트 패턴 |

---

## 적용 규칙 (스킬 요약)

### 코드 품질 (`code-quality`)
- **가독성**: 오버라이드 우선순위 로직은 단일 함수(`resolveTemplateField` 등)로 추출
- **예측 가능성**: "빈 입력 = 템플릿 값 유지", "비어있지 않은 입력 = 오버라이드" 규칙을 함수명/주석 없이도 코드만 보고 명확히 알 수 있게 작성
- **응집도**: 입력 상태(`overrideFields`)와 적용 로직을 같은 컴포넌트 안 가까운 위치에 배치
- **결합도**: `buildUtmUrlFromTemplate` 의 시그니처 확장은 옵셔널 매개변수로 추가하여 호출자 영향 최소화

### React 최적화 (`vercel-react-best-practices`)
- `previewRows` `useMemo` 의존성 배열에 새 오버라이드 상태 추가 (`rerender-dependencies`)
- 입력 폼은 단일 `overrideFields` 객체로 묶고 `setOverrideFields((prev) => ({ ...prev, ...patch }))` 패턴 사용 (`rerender-functional-setstate`)
- 입력 변경 시 `setHasGenerated(false)` 트리거로 결과 초기화 — 기존 `useEffect([baseUrl, selectedIds])` 의존성에 오버라이드 추가

---

## 관련 파일

수정 대상:
- `src/utm/UtmBulkBuilderPage.tsx` — 입력 필드 + URL 생성 + 단축링크 호출

테스트 영향:
- `test/utm/UtmBulkBuilderPage.test.tsx` — 오버라이드 시나리오 케이스 추가

---

## 작업

- [ ] **2.0 벌크 생성 campaign/term/content 즉석 입력 (Push 2)**

  - [ ] **2.1 공통 오버라이드 입력 필드 UI 추가 (i18n)**
    **작업 상세:**
    - `UtmBulkBuilderPage` 에 새 섹션 추가 (예: 단계 `1.5 캠페인 정보 입력` — 1단계 URL 입력과 2단계 템플릿 선택 사이)
    - 3개 입력 필드: `utm_campaign` / `utm_term` / `utm_content`
    - 라벨/플레이스홀더는 모두 `useT()` 호출 — 신규 메시지 키 정의:
      - `utm.bulk.overrideSection.title` (예: `1.5 캠페인 정보 (선택)`)
      - `utm.bulk.overrideSection.help` (예: `비워두면 템플릿 값이 그대로 사용됩니다.`)
      - `utm.bulk.override.campaign.label` / `.placeholder` (예: `예) mktchl3_dday`)
      - `utm.bulk.override.term.label` / `.placeholder`
      - `utm.bulk.override.content.label` / `.placeholder`
    - ko/en 두 locale 파일 모두에 키 추가
    - 모바일에서는 세로 스택, 데스크톱에서는 3컬럼 그리드
    - 상태 변수: `overrideFields: { campaign: string; term: string; content: string }`
    - 입력 변경 시 기존 `setHasGenerated(false)` 흐름과 통합 (생성 결과 초기화)
    - 안내 문구: "비워두면 템플릿에 저장된 값이 그대로 사용됩니다."
    **참조:** `src/utm/UtmBulkBuilderPage.tsx:312-327` (1단계 URL 입력 마크업 패턴)
    - [ ] 2.1.T1 입력 필드 렌더 + 변경 시 상태 반영 + 결과 초기화 트리거 테스트
    - [ ] 2.1.T2 `npm test test/utm/UtmBulkBuilderPage.test.tsx`

  - [ ] **2.2 URL 생성 로직에 오버라이드 적용**
    **작업 상세:**
    - `buildUtmUrlFromTemplate` 시그니처 확장:
      ```ts
      buildUtmUrlFromTemplate(
        baseUrl: string,
        template: { source; medium; campaign; term; content },
        overrides?: { campaign?: string; term?: string; content?: string },
      )
      ```
      - 우선순위: `overrides.X?.trim()` 가 truthy → 오버라이드 사용, 아니면 `template.X` 사용
    - `previewRows` `useMemo` 에서 `overrideFields` 적용 + 의존성 배열에 추가
    - `handleCreateShortUrlsInBulk` 에서 `row.utmUrl` 은 이미 오버라이드 반영된 상태 → 별도 변경 없음 (단, 검증)
    - `actionMessage`/사용자 안내는 그대로 유지
    **참조:** `src/utm/UtmBulkBuilderPage.tsx:33-62, 116-123, 232-279`
    - [ ] 2.2.T1 단위 테스트 케이스 추가:
      - 오버라이드 빈 값 → 템플릿 campaign/term/content 그대로 적용
      - 오버라이드 일부만 입력 → 입력된 값만 덮어쓰고 나머지는 템플릿 유지
      - 오버라이드 모두 입력 → 모든 템플릿의 결과 URL이 동일한 campaign/term/content 사용
      - 단축링크 일괄 생성 시에도 오버라이드 반영된 longUrl 로 호출되는지 mock 검증
    - [ ] 2.2.T2 `npm test test/utm/UtmBulkBuilderPage.test.tsx` 통과 + `npx tsc --noEmit`

---

## 완료 기준

- [ ] 벌크 생성 페이지에서 campaign/term/content 입력 가능
- [ ] 입력값이 있으면 모든 선택 템플릿의 해당 필드를 덮어쓰고 URL 생성
- [ ] 입력값이 비어있으면 기존 동작(템플릿 값 사용) 유지
- [ ] 일괄 단축링크 생성 시 오버라이드된 URL 로 단축링크 생성됨
- [ ] 기존 테스트 회귀 없음, 신규 시나리오 테스트 통과
- [ ] `npx tsc --noEmit` + `npm run build` 통과
