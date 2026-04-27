# Tasks: 0427-2 - Push 3

> PRD: .claude/0427-2.md
> Push 범위: 상단 헤더 서버 라벨 레이아웃 버그 수정 + 미완 한글화 보완
> 상태: 🔲 진행 중

---

### 에이전트 팀 구성

**팀 구성:** coordinator → developer + tester  
**이유:** 헤더/서버 드롭다운 레이아웃과 i18n 키/문구를 함께 조정하고, UI 회귀 확인이 필요함

#### 실행 순서
1. coordinator: 3.1~3.3 작업 분배
2. developer: 헤더 레이아웃 수정 후 i18n 키 보완
3. tester: 타입체크/빌드/테스트 및 실제 UI 배치 검증
4. coordinator: 결과 취합 후 완료 처리

#### 역할별 지시사항
- developer: "설정 옆 서버 텍스트 세로 배치 원인을 CSS 클래스와 DOM 구조에서 찾고, 가로 정렬로 고정. 이후 대시보드/목록/생성/태그/도메인 관련 한글 키를 점검해 누락을 보완."
- tester: "데스크톱/모바일에서 헤더 정렬을 확인하고, ko 언어에서 사이드바/주요 메뉴 텍스트가 일관되게 한글 노출되는지 검증."

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
| .claude/0427-2.md | 헤더/한글화 요구사항 원문 |
| src/common/MainHeader.tsx | 상단 헤더 버튼 및 드롭다운 영역 구조 |
| src/servers/ServersDropdown.tsx | 서버명 렌더링 및 줄바꿈/정렬 이슈 확인 |
| src/common/UnifiedSidebar.tsx | 한글 메뉴 키 사용 확인 |
| src/i18n/locales/ko.ts | 한글 번역 키/문구 보완 |
| src/i18n/locales/en.ts | 키 동기화 및 폴백 확인 |

### 적용 규칙 (스킬 요약)

#### 폴더 구조 (folder-structure)
- 헤더/서버 선택은 common, servers 도메인 내에서만 수정
- 번역 변경은 i18n/locales 파일에 집중
- 도메인 간 직접 의존 추가 금지

#### 코드 품질 (code-quality)
- 가독성: 헤더 버튼 레이아웃 클래스와 텍스트 스타일 분리
- 예측 가능성: 텍스트 줄바꿈/정렬을 명시적 클래스(whitespace-nowrap 등)로 제어
- 응집도: 한글화 변경은 locale 파일에 모아서 관리
- 결합도: 특정 화면에서만 쓰는 문자열 키는 범위를 좁혀 추가

#### React 최적화 (vercel-react-best-practices)
- rendering-conditional-render: 서버 선택 상태별 헤더 표시 분기를 명확히 유지
- rendering-hoist-jsx: 반복되는 헤더 액션 버튼 구성을 상수/헬퍼로 추출 가능 여부 검토
- rerender-memo: 서버 드롭다운 리스트 렌더 성능에 불필요한 재렌더 방지

### 관련 파일

- src/common/MainHeader.tsx - 상단 헤더 레이아웃
- src/servers/ServersDropdown.tsx - 서버명 표시 UI
- src/i18n/locales/ko.ts - 한글 번역
- src/i18n/locales/en.ts - 영문 번역 동기화
- test/common/MainHeader.test.tsx - 헤더 렌더링 테스트
- test/servers/ServersDropdown.test.tsx - 서버 드롭다운 테스트

---

## 작업

- [ ] 3.0 헤더 레이아웃 및 주요 메뉴 한글화 보완
  - [ ] 3.1 헤더 서버 텍스트 세로 배치 버그 수정 (커밋 단위)
    **작업 상세:**
    - 설정 옆 서버 라벨이 세로로 쪼개지는 원인(CSS 줄바꿈/폭/inline 배치) 파악
    - 서버 표시를 가로 정렬로 고정하고 작은 화면에서도 깨지지 않게 조정
    - 접근성 aria-label/tooltip 문구 영향 확인
    **참조:** 문서 src/common/MainHeader.tsx, src/servers/ServersDropdown.tsx
    - [ ] 3.1.T1 헤더/서버 드롭다운 레이아웃 테스트 작성 또는 수정
    - [ ] 3.1.T2 테스트 실행 및 검증

  - [ ] 3.2 미완 한글화 키 보완 (커밋 단위)
    **작업 상세:**
    - 대시보드, 단축링크 목록, 단축링크 만들기, 태그 관리, 도메인 관리 관련 누락 키 보완
    - ko/en 키셋 동기화
    - 하드코딩 영문/혼합 문구 제거
    **참조:** 문서 src/i18n/locales/ko.ts, src/i18n/locales/en.ts, src/common/UnifiedSidebar.tsx
    - [ ] 3.2.T1 i18n 키 누락/불일치 검증 테스트 작성
    - [ ] 3.2.T2 테스트 실행 및 검증

  - [ ] 3.3 회귀 검증 및 마무리 (커밋 단위)
    **작업 상세:**
    - 헤더, 사이드바, 관련 페이지에서 ko 언어 표시 점검
    - 변경 영향 범위 문서화 및 남은 이슈 목록 정리
    **참조:** 문서 src/common/MainHeader.tsx, src/common/UnifiedSidebar.tsx
    - [ ] 3.3.T1 시각 회귀 테스트 또는 스냅샷 업데이트
    - [ ] 3.3.T2 npx tsc --noEmit + npm run build 실행 및 검증
