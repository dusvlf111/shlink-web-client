# Tasks: 마케팅팀 후속 - Push 2 (홈 페이지 + 서버 PocketBase 통합 + 플로팅 버튼 삭제)

> PRD: `.claude/tasks/todo/prd-2026-04-27.md`
> Push 범위: 홈 헤딩 변경, 서버 리스트를 PocketBase 기반으로 통합, 플로팅 서버 정보 버튼 삭제
> 상태: 🔲 대기 (Push 1 완료 후 진행)

---

## 에이전트 팀 구성

**팀 구성:** coordinator → developer + tester
**이유:** 다수 파일 수정 (Home.tsx, CreateServer flow, App.tsx, ServerInfoFloating 삭제) + redux/PocketBase 동기화 로직

#### 실행 순서
1. **coordinator**: 작업 2.1 → 2.2 → 2.3 → 2.4 순서로 분배
2. **developer**: 각 하위 작업 별도 커밋
3. **tester**: 각 커밋마다 회귀 + 통합 검증

#### 역할별 지시사항
- **developer**: "PocketBase 가 source-of-truth. redux 는 캐시. 비로그인 사용자/PocketBase 실패 시 redux 만으로 동작 유지(회귀 방지). 모든 신규 라벨 i18n."
- **tester**: "PocketBase mock 으로 fetch/create 흐름 검증. 비로그인 fallback 케이스 포함."

---

## 실행 환경

- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent
- **이미지 읽기:** Read 도구로 .png/.jpg 파일 직접 열람 가능

---

## 참조 문서

| 문서 | 용도 |
|------|------|
| `.claude/tasks/0427-1.md` | 원본 요청 (`Welcome! → 서버 리스트`, 예시 항목 포함) |
| `src/common/Home.tsx` | 헤딩 + 서버 리스트 컴포넌트 |
| `src/servers/CreateServer.tsx` | 서버 등록 흐름 |
| `src/servers/reducers/servers.ts` | redux servers slice (`createServers`) |
| `src/servers/useServerConfigs.ts` | 기존 PocketBase 조회 훅 (확장 또는 통합 대상) |
| `src/lib/pocketbase.ts` | PB 클라이언트 |
| `src/common/ServerInfoFloating.tsx` | 삭제 대상 컴포넌트 |
| `src/app/App.tsx` | `<ServerInfoFloating />` 호출 위치 (line 82) |
| `src/i18n/locales/ko.ts`, `en.ts` | 신규 메시지 키 추가 대상 |

### PocketBase 콜렉션 스키마 추정 (`server_configs`)
```
id: string
name: string
url: string
api_key?: string
```
필드명 차이: 클라이언트 `ServerData` 는 `apiKey`, PocketBase 는 `api_key`. 변환 함수 필요.

---

## 적용 규칙 (스킬 요약)

### 코드 품질
- **가독성**: PocketBase ↔ ServerData 변환을 단일 함수로 격리 (`fromPocketBase`, `toPocketBase`)
- **예측 가능성**: 로그인 여부 검사를 한 곳에서 (`pb.authStore.isValid`)
- **응집도**: 서버 PocketBase 어댑터를 `src/servers/services/serverConfigsService.ts` (또는 `useServerConfigs.ts` 확장) 한 파일에
- **결합도**: redux slice 는 그대로 유지, 서비스 레이어가 데이터 fetch/save 후 redux 에 전파

### React 최적화
- 홈에서 서버 리스트는 `useServers()` (redux) 그대로 사용. 별도 `useEffect` 로 PocketBase 결과를 redux 로 hydrate
- 신규 서버 등록 시 PocketBase create → redux createServers 순서

---

## 관련 파일

수정 대상:
- `src/common/Home.tsx` — `Welcome!` 헤딩 → i18n `home.title` 키, 안내 문구 정리
- `src/servers/CreateServer.tsx` — saveNewServer 흐름에 PocketBase create 호출 추가
- `src/servers/reducers/remoteServers.ts` — fetch 출처 추가 (PocketBase 우선, servers.json fallback)
- `src/servers/useServerConfigs.ts` — 또는 신규 서비스 파일에 통합
- `src/app/App.tsx` — `<ServerInfoFloating />` 호출 제거
- `src/i18n/locales/ko.ts`, `en.ts` — `home.title`, `home.subtitle` 등 신규 키
- 테스트 mock 파일 (필요 시)

삭제 대상:
- `src/common/ServerInfoFloating.tsx`
- 관련 import / 테스트

---

## 작업

- [ ] **2.0 홈 + 서버 PocketBase 통합 + 플로팅 삭제 (Push 2)**

  - [ ] **2.1 i18n 키 추가 (`home.*`)**
    **작업 상세:**
    - `src/i18n/locales/ko.ts` 에 추가:
      - `home.title`: `서버 리스트`
      - `home.empty.title`: `등록된 서버가 없습니다.`
      - `home.empty.action`: `서버 추가하기`
      - `home.subtitle`: `서버를 클릭해 단축 링크 관리를 시작하세요.`
    - `en.ts` 에 영문 추가
    - [ ] 2.1.T1 i18n 테스트 키 누락 확인 (compile-time 보장)
    - [ ] 2.1.T2 `npx tsc --noEmit`

  - [ ] **2.2 `Home.tsx` 헤딩 + 안내 문구 i18n**
    **작업 상세:**
    - `Welcome!` → `{t('home.title')}`
    - 빈 상태 영문 문구 (`This application will help you...`) → `{t('home.subtitle')}`
    - `Add a server` 버튼 → `{t('home.empty.action')}`
    - 기존 `ServersListGroup` 그대로 재사용
    - 기존 `한국어 잔존 안내문` 도 i18n 키로
    **참조:** `src/common/Home.tsx`
    - [ ] 2.2.T1 홈 페이지 테스트 — `home.title` 텍스트 + 서버 리스트 렌더 + en locale fallback
    - [ ] 2.2.T2 `npm test test/common/Home`

  - [ ] **2.3 서버 등록을 PocketBase 에 저장**
    **작업 상세:**
    - `src/servers/services/serverConfigsService.ts` 신규 생성:
      ```ts
      export type ServerConfigRecord = { id: string; name: string; url: string; api_key?: string };
      export const fromPocketBase = (rec: ServerConfigRecord): ServerWithId => ({
        id: rec.id, name: rec.name, url: rec.url, apiKey: rec.api_key ?? '',
      });
      export const toPocketBase = (data: ServerData): Omit<ServerConfigRecord, 'id'> => ({
        name: data.name, url: data.url, api_key: data.apiKey,
      });
      export const fetchServerConfigs = async (): Promise<ServerWithId[]> => { ... };
      export const createServerConfig = async (data: ServerData): Promise<ServerWithId> => { ... };
      ```
    - `CreateServer.tsx` 의 `saveNewServer` 수정:
      ```ts
      const saveNewServer = async (newServerData: ServerData) => {
        let saved: ServerWithId;
        try {
          if (pb.authStore.isValid) {
            saved = await createServerConfig(newServerData);
          } else {
            const [withId] = ensureUniqueIds(servers, [newServerData]);
            saved = withId;
          }
        } catch {
          const [withId] = ensureUniqueIds(servers, [newServerData]);
          saved = withId;
        }
        createServers([saved]);
        navigate(`/server/${saved.id}`);
      };
      ```
    - `useLoadRemoteServers` 도 PocketBase 우선 fetch, 실패 시 기존 `servers.json` fallback (또는 둘 다 merge)
    **참조:** `src/servers/CreateServer.tsx:42-48`, `src/servers/reducers/remoteServers.ts:16-24`
    - [ ] 2.3.T1 서비스 단위 테스트 + 흐름 통합 테스트 (mock pb)
    - [ ] 2.3.T2 `npm test`

  - [ ] **2.4 `ServerInfoFloating` 삭제**
    **작업 상세:**
    - `src/common/ServerInfoFloating.tsx` 파일 삭제
    - `src/app/App.tsx` 에서 import + `<ServerInfoFloating />` 제거 (line 11, 82)
    - 관련 테스트 파일 있으면 삭제
    **참조:** `src/app/App.tsx`
    - [ ] 2.4.T1 App 통합 테스트 — floating 버튼 미렌더 확인
    - [ ] 2.4.T2 `npm test test/app` + 전체 회귀

---

## 완료 기준

- [ ] 홈 헤딩이 `서버 리스트` (ko) / `Server list` (en)
- [ ] 서버 등록 시 PocketBase 에 저장 + redux 동기화
- [ ] 비로그인 / PocketBase 실패 시에도 로컬 등록 동작 (회귀 방지)
- [ ] 우측 하단 플로팅 서버 정보 버튼 사라짐
- [ ] `npx tsc --noEmit` + `npx vite build` 통과
- [ ] 전체 테스트 회귀 없음
