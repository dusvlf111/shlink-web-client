# Tasks: 0427-2 - Push 2

> PRD: .claude/0427-2.md
> Push 범위: UTM 템플릿/벌크 생성 UX 개선 (source+medium 필수, 나머지 선택)
> 상태: 🔲 진행 중

---

### 에이전트 팀 구성

**팀 구성:** coordinator → developer + tester  
**이유:** 템플릿 데이터 구조, 템플릿 관리 UI, 벌크 생성 UI/로직, 번역 및 테스트 동시 수정이 필요함

#### 실행 순서
1. coordinator: 2.1~2.4 작업 순서 관리
2. developer: 데이터 모델 → 템플릿 관리 UI → 벌크 생성 UI 순서로 구현
3. tester: 하위 작업별 타입체크/빌드/테스트 실행, 실패 시 수정
4. coordinator: 결과 취합 및 Push 완료 상태 반영

#### 역할별 지시사항
- developer: "source/medium은 반드시 required로 유지하고, campaign/term/content는 optional 처리. 벌크 템플릿 선택 UX에서 빈 campaign 숨김과 태그 설명 노출까지 구현."
- tester: "폼 검증(필수/선택), 템플릿 선택 시 렌더링 분기, 태그 설명 노출 여부를 테스트로 검증."

### 실행 환경 (팀 미사용 시)

- 사용 가능 도구: Read, Write, Edit, Bash, Glob, Grep, Task
- 사용 불가 도구: Skill, Agent
- 이미지 읽기: Read 도구로 .png/.jpg 파일 직접 열람 가능
- 병렬 작업: 불가 (순차 실행)

### 참조 이미지

PRD에 명시된 참조 이미지 없음.

| 이미지 | 용도 | 관련 작업 |
|--------|------|-----------|
| 없음 | PRD 원문에 스크린샷 경로 미기재 | - |

### 참조 문서

작업 시작 전 반드시 Read로 읽을 것:

| 문서 | 용도 |
|------|------|
| .claude/0427-2.md | UTM 템플릿/벌크 요구사항 원문 |
| src/utm/useUtmData.ts | 템플릿 타입/저장 로직 확인 |
| src/utm/UtmTemplateManager.tsx | 템플릿 입력 UI 및 검증 로직 |
| src/utm/UtmBulkBuilderPage.tsx | 템플릿 선택/일괄 생성 로직 |
| src/utm/UtmFieldInput.tsx | 필수 입력 UI 표현 방식 참조 |
| src/i18n/locales/ko.ts | UTM 관련 한글 문구 키 보강 |
| src/i18n/locales/en.ts | 영문 문구 동기화 |

### 적용 규칙 (스킬 요약)

#### 폴더 구조 (folder-structure)
- UTM 관련 변경은 src/utm 하위에 유지하고 공용 컴포넌트로 성급히 승격하지 않음
- 템플릿 모델/훅 변경은 useUtmData.ts 중심으로 응집
- 같은 계층 다른 도메인 import 추가 최소화

#### 코드 품질 (code-quality)
- 가독성: required 필드(source, medium)와 optional 필드를 코드 구조로 명확히 구분
- 예측 가능성: 템플릿 적용 시 override 우선순위를 함수로 명시
- 응집도: 템플릿 검증 규칙을 한 곳(폼 스키마/헬퍼)에서 관리
- 결합도: UI 컴포넌트가 PocketBase 스키마 세부사항에 직접 결합되지 않도록 훅으로 추상화

#### React 최적화 (vercel-react-best-practices)
- rerender-memo: 템플릿 옵션 목록 렌더가 크면 memoized row/option 사용
- rendering-hoist-jsx: 필드 메타데이터(source/medium/optional 목록)는 컴포넌트 외부 상수화
- rendering-conditional-render: campaign 값이 없으면 UI 자체를 렌더하지 않도록 명시적 분기
- client-swr-dedup: 템플릿/태그 목록 조회 중복 호출 방지 검토

### 관련 파일

- src/utm/useUtmData.ts - UTM 템플릿 타입 및 CRUD 훅
- src/utm/UtmTemplateManager.tsx - 템플릿 관리 화면
- src/utm/UtmBulkBuilderPage.tsx - 벌크 생성 화면 및 템플릿 적용
- src/utm/UtmFieldInput.tsx - 필수/선택 필드 UI 컴포넌트
- test/utm/UtmTemplateManager.test.tsx - 템플릿 관리 테스트
- test/utm/UtmBulkBuilderPage.test.tsx - 벌크 생성 테스트

---

## 작업

- [ ] 2.0 UTM 템플릿/벌크 생성 필수값 정책 개선
  - [ ] 2.1 템플릿 데이터 구조와 검증 규칙 정리 (커밋 단위)
    **작업 상세:**
    - source, medium은 필수
    - campaign, term, content는 선택값으로 모델/검증 반영
    - 기존 데이터와 호환되는 마이그레이션 분기(빈 문자열 허용) 추가
    **참조:** 문서 src/utm/useUtmData.ts
    - [ ] 2.1.T1 타입/검증 유닛 테스트 작성
    - [ ] 2.1.T2 테스트 실행 및 검증

  - [ ] 2.2 UTM 템플릿 관리 폼 UX 개선 (커밋 단위)
    **작업 상세:**
    - source와 medium 입력을 같은 줄 배치하고 required 표시
    - campaign/term/content는 optional 섹션으로 분리
    - 저장 시 필수값 누락 안내 문구 정비
    **참조:** 문서 src/utm/UtmTemplateManager.tsx, src/utm/UtmFieldInput.tsx
    - [ ] 2.2.T1 템플릿 관리 화면 테스트 코드 작성
    - [ ] 2.2.T2 테스트 실행 및 검증

  - [ ] 2.3 벌크 생성 템플릿 선택 UX 개선 (커밋 단위)
    **작업 상세:**
    - 템플릿 선택에서도 source/medium만 필수 반영
    - campaign 값이 없는 템플릿은 campaign 표시 영역 숨김
    - 태그에 description이 있으면 선택/미리보기 영역에 함께 표시
    **참조:** 문서 src/utm/UtmBulkBuilderPage.tsx, src/utm/useUtmData.ts
    - [ ] 2.3.T1 벌크 생성 선택/표시 분기 테스트 코드 작성
    - [ ] 2.3.T2 테스트 실행 및 검증

  - [ ] 2.4 문구/도움말 정리 및 회귀 테스트 (커밋 단위)
    **작업 상세:**
    - 변경된 폼 정책에 맞춰 ko/en locale 문구 업데이트
    - 필수/선택 정책 불일치 문구 제거
    - UTM 전체 테스트 스위트 실행
    **참조:** 문서 src/i18n/locales/ko.ts, src/i18n/locales/en.ts
    - [ ] 2.4.T1 locale 키/텍스트 회귀 테스트 작성 또는 수정
    - [ ] 2.4.T2 npx tsc --noEmit + npm run build + npm test test/utm 실행 및 검증
