# Tasks: PRD-0602 - Push 3 — 방문 데이터: 봇 기본 제외 (P0)

> PRD: `.claude/tasks/todo/prd-0602.md` (§3, 특히 3-A)
> Push 범위: 통계 화면에서 봇 추정 방문을 기본 제외(`excludeBots` 기본 ON). 3-B(해외 차단)는 레포 밖 운영 작업이라 본 Push 제외.
> 상태: 🔲 진행 중

---

### 에이전트 팀 구성

**팀 구성:** developer + tester
**이유:** 핵심 변경은 설정 기본값 1곳(`settings.ts`)이지만, localStorage 영속·web-component 연동 회귀를 검증해야 한다.

#### 실행 순서
1. **developer**: `initialState.visits.excludeBots = true` + 기존 사용자 마이그레이션 고려 구현 → 커밋
2. **tester**: 타입·테스트·빌드 + (가능 시) playwright로 통계 화면 봇 제외 토글 기본값 확인
3. coordinator: 결과 취합

#### 역할별 지시사항
- **developer**: "`src/settings/reducers/settings.ts`의 `initialState.visits`에 `excludeBots: true` 추가. 단, settings는 localStorage에 영속되므로 **기존 사용자**는 자동 반영 안 됨 — `setSettings`가 `mergeDeepRight`인 점을 고려해, 저장된 settings에 `visits.excludeBots`가 없을 때만 true로 보정하는 1회 마이그레이션을 store 초기화 지점에 둘지 검토(과하면 생략하고 신규 기본값만)."
- **tester**: "`npx vitest run test/settings/` + 타입체크. web-component에 `settings.visits.excludeBots`가 전달되는지 `ShlinkWebComponentContainer.tsx` 경로 확인."

### 실행 환경 (팀 미사용 시)
- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent

### 참조 문서

작업 시작 전 반드시 `Read`로 읽을 것:

| 문서 | 용도 |
|------|------|
| `.claude/tasks/todo/prd-0602.md` | §3-A 결정·인수 조건, §3-B(레포 밖) 경계 |
| `src/settings/reducers/settings.ts` | `initialState.visits`(`:26-28`) — 수정 대상 |
| `src/common/ShlinkWebComponentContainer.tsx` | `settings`를 web-component로 전달(`:44,58`) |
| `node_modules/@shlinkio/shlink-web-component/dist/settings.d.ts` | `VisitsSettings.excludeBots?: boolean`(`:92-94`) 타입 확인 |
| `src/store/index.ts` | settings localStorage 영속 범위(`states: ['settings','servers']`) |

### 적용 규칙 (스킬 요약)

#### 코드 품질 (`code-quality`)
- **예측 가능성**: 기본값 변경이 기존 사용자에게 어떤 영향인지 명확히(주석/마이그레이션).
- **응집도**: 방문 관련 기본값은 `initialState.visits` 한 곳에.

#### 타입
- `Settings`/`VisitsSettings` 타입(`@shlinkio/shlink-web-component/settings`)을 준수. 임의 키 추가 금지.

### 관련 파일
- `src/settings/reducers/settings.ts` — `initialState.visits.excludeBots: true` (수정 대상)
- (검토) `src/store/index.ts` 또는 settings 초기화 지점 — 기존 사용자 1회 보정 마이그레이션
- `test/settings/reducers/settings.test.ts` — 기본값 테스트

---

## 작업

- [x] 1.0 봇 방문 기본 제외 (PRD §3-A)
    - [x] 1.1 `initialState.visits.excludeBots = true` 적용
        **작업 상세:** `settings.ts:26-28`의 `visits: { defaultInterval: 'last30Days' }` → `visits: { defaultInterval: 'last30Days', excludeBots: true }`. 타입(`VisitsSettings`)에 `excludeBots`가 있으므로 그대로 추가.
        **참조:** PRD §3-A
        - [x] 1.1.T1 `test/settings/reducers/settings.test.ts`: 초기 settings의 `visits.excludeBots === true` 단언 추가
        - [x] 1.1.T2 `npx vitest run test/settings/` + `npx tsc --noEmit` 통과
    - [x] 1.2 (선택) 기존 사용자 마이그레이션 검토·적용 — **미적용(신규 기본값만)**
        **작업 상세:** localStorage에 이미 settings가 있는 사용자는 신규 기본값을 못 받음. 저장된 settings에 `visits.excludeBots`가 `undefined`면 true로 보정하는 1회 로직을 store 하이드레이션 직후에 둘지 판단. 부작용(사용자가 의도적으로 false로 둔 경우 덮어쓰기) 위험이 있으면 **생략하고 신규 기본값만** 적용 + 결과보고서에 명시.
        **참조:** PRD §3-A, `src/store/index.ts`

        > NOTE: 마이그레이션 **미적용**, 신규 기본값(`initialState.visits.excludeBots = true`)만 적용함. 사유:
        > 1. **하이드레이션 오버라이드 구조 불변 유지** — store는 `preloadedState = getStateFromLocalStorage()`로 localStorage의 `settings` 슬라이스를 그대로 주입한다(`src/store/index.ts:14-17`). 기존 사용자는 영속된 `visits`에 `excludeBots` 키가 없는 상태이며, 이를 보정하려면 `migrateDeprecatedSettings`류의 하이드레이션 변형이 필요하다. 지시(§"무리하게 store 하이드레이션을 건드리지 마라")에 따라 회귀 위험을 피하기 위해 건드리지 않는다.
        > 2. **부작용 위험** — web-component 설정 UI는 저장 시 전체 settings 객체를 기록하므로, 토글을 명시적으로 끈 사용자는 `excludeBots: false`(정의됨)로 저장되어 "undefined일 때만 보정" 로직이라도 그를 덮어쓰지 않는다. 그러나 PRD §3-A 인수조건은 "사용자가 원하면 봇 포함 토글 가능"을 명시하므로, 기존 사용자의 명시적 선택을 보존하는 쪽이 안전하다. 신규 기본값만 두면 신규 사용자/초기화 사용자에게 의도대로 ON이 적용되고, 기존 사용자는 본인이 설정에서 직접 켤 수 있다.
        > 3. **저비용 회복** — 기존 사용자도 설정 화면을 한 번 저장하면 `excludeBots`가 기록되며, 봇 포함/제외 토글이 그대로 노출된다(인수조건 충족). 강제 마이그레이션의 회귀 비용 대비 이득이 낮다.
        - [x] 1.2.T1 마이그레이션 적용 시 해당 동작 테스트, 미적용 시 결과보고서에 사유 기록 — 미적용, 상기 NOTE에 사유 기록
        - [x] 1.2.T2 `npx tsc --noEmit` + `npm run build` 통과

---

### 운영 메모 (이 Push 범위 밖 — 별도 처리)
- **3-B 해외 트래픽 수집 차단**: Coolify/리버스 프록시 GeoIP 차단 또는 Shlink 서버 설정. 인프라 접근 권한 필요 → 별도 운영 티켓으로 추적(코드 변경 아님).

### 완료 처리
- 통과 후 `.claude/tasks/done/`로 이동 + `result-prd-0602-push3.md` 작성(마이그레이션 적용/생략 여부 명시).
