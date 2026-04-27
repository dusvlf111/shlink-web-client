# Tasks: 0427-2 - Push 1

> PRD: .claude/0427-2.md
> Push 범위: 공유 통계 링크 생성/조회 오류 수정 및 결과 표시 안정화
> 상태: 🔲 진행 중

---

### 에이전트 팀 구성

**팀 구성:** coordinator → developer + tester  
**이유:** 공유 토큰 저장 로직, 통계 조회 로직, 공개 페이지 렌더링, 테스트까지 3개 이상 파일 연동이 필요함

#### 실행 순서
1. coordinator: 작업 1.1~1.3 분배 및 완료 여부 확인
2. developer: 각 하위 작업 구현 후 커밋
3. tester: 하위 작업별 타입체크/빌드/테스트 실행 및 실패 시 수정
4. coordinator: 결과 취합 후 Push 완료 처리

#### 역할별 지시사항
- developer: "공유 링크에 full URL이 short code로 잘못 전달되는 원인을 먼저 재현하고, API 요청 경로/파라미터를 일관되게 수정한 뒤 리스트 갱신까지 포함해 커밋."
- tester: "각 커밋마다 npx tsc --noEmit, npm run build, 공유 통계 관련 테스트를 실행하고 회귀 여부를 보고."

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
| .claude/0427-2.md | 원본 요구사항 확인 |
| src/share/ShareStatsManagerPage.tsx | 공유 토큰 생성/리스트 UI 동작 확인 |
| src/share/PublicShareStatsPage.tsx | 공유 링크 접근 시 통계 조회 흐름 확인 |
| src/share/services/shareTokenService.ts | token payload 및 server/short code 저장 규칙 확인 |
| src/share/ShortUrlPicker.tsx | short code 선택 데이터 구조 확인 |
| src/i18n/locales/ko.ts | 에러/안내 문구 키 업데이트 시 반영 위치 |

### 적용 규칙 (스킬 요약)

#### 폴더 구조 (folder-structure)
- 기존 share 도메인 파일을 우선 수정하고, 공용화가 필요한 경우에만 common으로 이동
- 같은 계층 간 불필요한 직접 의존 추가 금지
- 새 헬퍼가 필요하면 share/services 또는 share 하위에 배치하고 외부 공개 경로를 최소화

#### 코드 품질 (code-quality)
- 가독성: short code와 full URL 변수명을 명확히 분리
- 예측 가능성: API 파라미터 생성 함수를 단일 경로로 모아 동일 입력이면 동일 요청 보장
- 응집도: 공유 통계 생성/조회 로직은 share 도메인 내부에 유지
- 결합도: UI 컴포넌트가 URL 조합 세부 규칙을 직접 알지 않도록 서비스 함수로 캡슐화

#### React 최적화 (vercel-react-best-practices)
- rendering-conditional-render: 에러/로딩/결과 상태를 명시적 분기로 렌더
- rendering-hoist-jsx: 고정 안내 블록/상수 문자열은 컴포넌트 외부 상수화 검토
- rerender-memo: 무거운 목록 아이템 렌더 시 memo 또는 stable props 유지

### 관련 파일

- src/share/ShareStatsManagerPage.tsx - 공유 링크 생성/목록 갱신 UI
- src/share/PublicShareStatsPage.tsx - 공유 링크 통계 조회 진입점
- src/share/services/shareTokenService.ts - 공유 토큰 저장/조회 모델
- test/share/ShareStatsManagerPage.test.tsx - 생성/목록 표시 테스트
- test/share/PublicShareStatsPage.test.tsx - 공개 링크 조회 테스트

---

## 작업

- [ ] 1.0 공유 통계 링크 오류 수정 및 생성 결과 노출 안정화
  - [x] 1.1 API 경로 파라미터 정합성 수정 (커밋 단위)
    **작업 상세:**
    - 공개 통계 조회 시 short URL 식별자에 full URL이 들어가 404가 발생하는 경로를 재현
    - shortCode/path 전달 규칙을 단일 헬퍼로 정리
    - 잘못된 `https:/...` 형태가 요청 URL에 포함되지 않게 방어 로직 추가
    **참조:** 문서 src/share/PublicShareStatsPage.tsx, src/share/services/shareTokenService.ts
    - [x] 1.1.T1 공유 통계 경로 파싱 테스트 추가/수정
    - [x] 1.1.T2 관련 테스트 실행 및 검증

  - [x] 1.2 공유 생성 후 발급 링크/목록 표시 동기화 (커밋 단위)
    **작업 상세:**
    - 공유 생성 성공 후 발급 URL 미노출 문제 해결
    - 생성 직후 목록이 갱신되지 않는 상태 업데이트 흐름 수정
    - 실패/성공 메시지를 i18n 키 기반으로 통일
    **참조:** 문서 src/share/ShareStatsManagerPage.tsx, src/i18n/locales/ko.ts
    - [x] 1.2.T1 생성 성공/실패 UI 테스트 작성
    - [x] 1.2.T2 테스트 실행 및 검증

  - [ ] 1.3 회귀 방지 정리 및 에러 핸들링 강화 (커밋 단위)
    **작업 상세:**
    - 서버 미선택, 잘못된 tokenId 등 예외 케이스 처리
    - 사용자에게 노출되는 에러 문구를 재검토하고 누락 키 보완
    - 최소 파일 변경으로 리팩터링 마무리
    **참조:** 문서 src/share/PublicShareStatsPage.tsx, src/i18n/locales/en.ts
    - [ ] 1.3.T1 예외 케이스 테스트 코드 작성
    - [ ] 1.3.T2 npx tsc --noEmit + npm run build 실행 및 검증
