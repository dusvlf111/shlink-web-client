# Tasks: 마케팅팀 후속 - Push 1 (단축링크 사이드바 클릭 버그 fix)

> PRD: `.claude/tasks/todo/prd-2026-04-27.md`
> Push 범위: `UnifiedSidebar` 가 URL 에 `serverId` 없을 때 fallback 서버를 선택해 단축링크 메뉴를 활성화
> 상태: 🔲 진행 중 (긴급)

---

## 에이전트 팀 구성

**팀 구성:** developer + tester (단순 단일 컴포넌트 수정)
**이유:** 1 파일 수정 + 회귀 방지 테스트 추가만 필요

#### 실행 순서
1. **developer**: `UnifiedSidebar.tsx` 수정, 테스트 보강, 커밋
2. **tester**: `npm test test/common/UnifiedSidebar` + 전체 회귀

#### 역할별 지시사항
- **developer**: "redux 의 servers 맵에서 autoConnect → 첫 번째 → null 순서로 fallback. URL params 의 serverId 가 우선. 등록된 서버 없을 때만 disabled."
- **tester**: "회귀 + 신규 4 케이스 (URL 우선 / autoConnect / 첫 서버 / 비어있을 때 disabled)"

---

## 실행 환경

- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent
- **이미지 읽기:** Read 도구로 .png/.jpg 파일 직접 열람 가능

---

## 참조 문서

| 문서 | 용도 |
|------|------|
| `src/common/UnifiedSidebar.tsx` | 수정 대상, 현재 `requiresServer && !hasServer` 분기 |
| `src/servers/reducers/servers.ts` | `useServers()` 훅 — `servers: ServersMap` 제공 |
| `src/servers/data/index.ts` | `ServerWithId` (`autoConnect?: boolean`) 타입 |
| `test/common/UnifiedSidebar.test.tsx` | 기존 테스트 패턴 |

---

## 적용 규칙 (스킬 요약)

### 코드 품질
- **가독성**: fallback 우선순위(autoConnect → first) 를 한 함수(`pickFallbackServerId`) 로 추출
- **예측 가능성**: URL params 가 우선이라는 규칙을 코드 구조로 표현 (`serverIdFromParams ?? fallbackServerId`)
- **응집도**: 사이드바 fallback 로직은 `UnifiedSidebar.tsx` 안에 둠 — 작은 규모, 다른 곳에서 재사용 X

### React 최적화
- `useServers()` 가 반환하는 `servers` 맵의 모든 값 순회는 `useMemo` 로 감싸 fallback 변경 시에만 재계산
- 단, 서버 수가 적어 micro-opt 무관 — 일단 단순 표현 우선

---

## 관련 파일

수정 대상:
- `src/common/UnifiedSidebar.tsx` — fallback 서버 선정 + `hasServer` 판정 로직 변경

테스트 영향:
- `test/common/UnifiedSidebar.test.tsx` — 신규 케이스 추가

---

## 작업

- [ ] **1.0 단축링크 사이드바 fallback 서버 (Push 1)**

  - [ ] **1.1 `UnifiedSidebar` 에 fallback 서버 선정 로직 추가**
    **작업 상세:**
    - `useServers()` import 추가
    - `pickFallbackServerId(servers: ServersMap): string | null` 모듈 스코프 함수 추가
      - autoConnect 가 true 인 서버가 있으면 그 id
      - 없으면 첫 번째 서버 id (`Object.values(servers)[0]?.id`)
      - 둘 다 없으면 null
    - 컴포넌트 내부:
      ```ts
      const { serverId } = useParams<{ serverId: string }>();
      const { servers } = useServers();
      const fallbackServerId = useMemo(() => pickFallbackServerId(servers), [servers]);
      const effectiveServerId = serverId ?? fallbackServerId ?? null;
      const serverPrefix = effectiveServerId ? `/server/${effectiveServerId}` : '';
      const hasServer = !!effectiveServerId;
      ```
    - 결과: 등록된 서버가 1개라도 있으면 단축링크 메뉴 클릭 가능
    **참조:** `src/common/UnifiedSidebar.tsx:118-125` (현재 serverId 로직), `src/servers/reducers/servers.ts:78-90` (`useServers`)
    - [ ] 1.1.T1 신규 테스트 — 등록된 서버 0개일 때만 disabled, autoConnect 우선, 첫 서버 fallback, URL params 우선
    - [ ] 1.1.T2 `npm test test/common/UnifiedSidebar` + `npm test` 전체 회귀

---

## 완료 기준

- [ ] 등록된 서버가 1개 이상이면 홈/UTM/임의 페이지에서 단축링크 메뉴 클릭 가능
- [ ] URL 에 `/server/X/...` 가 있으면 X 를 우선 사용
- [ ] autoConnect 표시된 서버가 있으면 그 서버 우선
- [ ] 등록된 서버 0개일 때만 disabled 회색 표시
- [ ] 기존 테스트 회귀 없음, 신규 4+ 케이스 통과
- [ ] `npx tsc --noEmit` + `npx vite build` 통과
