# 결과보고서: 마케팅팀 후속 - Push 2 (홈 + PocketBase 서버 통합 + 플로팅 삭제)

> 완료일: 2026-04-27
> Push 범위: 홈 페이지 i18n, PocketBase `server_configs` 콜렉션 source-of-truth 화, ServerInfoFloating 제거

## 구현 요약

| 작업 | 상태 | 커밋 |
|------|------|------|
| 2.1 i18n 키 (`home.*`) 추가 | ✅ | `c89c3acc` |
| 2.2 Home.tsx i18n | ✅ | `c89c3acc` |
| 2.3 PocketBase 서버 등록/조회 통합 | ✅ | `c89c3acc` |
| 2.4 ServerInfoFloating 삭제 | ✅ | `c89c3acc` |

## 신규 파일

- `src/servers/services/serverConfigsService.ts`
  - `fromPocketBase` / `toPocketBase` 어댑터 (`api_key` ↔ `apiKey` 변환)
  - `fetchServerConfigs()` — 로그인 시 `getFullList`
  - `createServerConfig(data)` — PB 에 create 후 ServerWithId 반환
  - `isPocketBaseLoggedIn()` 헬퍼

## 수정 파일

- `src/common/Home.tsx` — `Welcome!` → `t('home.title')`, 빈 상태 영문 안내 → `home.subtitle/empty.*`
- `src/servers/CreateServer.tsx` — `saveNewServer` 가 `isPocketBaseLoggedIn()` 일 때 `createServerConfig` 호출, 실패/비로그인 시 redux fallback
- `src/servers/reducers/remoteServers.ts` — PocketBase fetch 우선, 빈 결과 시 `servers.json` fallback. 빈 결과에도 `createServers` dispatch 유지로 회귀 없음
- `src/app/App.tsx` — `<ServerInfoFloating />` import + 호출 제거
- `src/i18n/locales/ko.ts`, `en.ts` — `home.*` 키 추가
- `test/common/Home.test.tsx` — 새 라벨 매칭 (`서버 리스트`, `등록된 서버가 없습니다.`, `Shlink에 대해 더 알아보기`)

## 삭제 파일

- `src/common/ServerInfoFloating.tsx`

## 테스트 결과

- 전체: 303 / 303 passed
- Home: 4 / 4 (i18n 키 매칭으로 업데이트)
- remoteServers: 4 / 4 (회귀, fetch 흐름은 그대로 3 dispatch)

## 적용 규칙

- code-quality: PB ↔ ServerData 변환은 단일 어댑터 파일에 격리, redux 는 캐시 역할만
- folder-structure: 신규 PB 어댑터는 `src/servers/services/` (기존 `ServersExporter`/`Importer` 패턴 따름)

## 이슈/특이사항

1. PocketBase 가 `api_key` 컬럼명을 사용하므로 클라이언트 `apiKey` 와 변환 필요 → 어댑터 단일 위치에서 처리
2. PocketBase 실패/비로그인 fallback 보존 — 회귀 위험 최소화
3. 외부 패키지에서 사용하던 `useServerConfigs` 훅은 삭제하지 않고 그대로 둠 (다른 곳에서 사용 안 됨, 불필요하면 후속 정리 가능)
