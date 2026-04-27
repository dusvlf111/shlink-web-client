# Tasks: 마케팅팀 후속 - Push 3 (사용자 관리 승인 대기 배지)

> PRD: `.claude/tasks/todo/prd-2026-04-27.md`
> Push 범위: `MainHeader` 의 `사용자 관리` 메뉴 우측 상단에 `status: 'pending'` 사용자 수 배지 표시
> 상태: 🔲 대기 (Push 1, 2 완료 후 진행 가능, 다른 push 와 무관해 병렬 가능)

---

## 에이전트 팀 구성

**팀 구성:** developer + tester
**이유:** 1~2 파일 변경, 데이터 fetch 흐름만 추가

#### 실행 순서
1. **developer**: `usePendingUsersCount` 훅 + `MainHeader` 배지 적용
2. **tester**: 배지 0/N 케이스, 비-admin 사용자 미노출

#### 역할별 지시사항
- **developer**: "PocketBase getList(perPage:1) 으로 totalItems 만 가져와 비용 최소화. admin 일 때만 fetch + realtime 구독 옵션 검토."
- **tester**: "배지 카운트 0 → 비표시, 5 → `5` 표시, role !== admin → 메뉴 자체 비표시 회귀 케이스"

---

## 실행 환경

- **사용 가능 도구:** Read, Write, Edit, Bash, Glob, Grep, Task
- **사용 불가 도구:** Skill, Agent
- **이미지 읽기:** Read 도구로 .png/.jpg 파일 직접 열람 가능

---

## 참조 문서

| 문서 | 용도 |
|------|------|
| `src/common/MainHeader.tsx` | 배지 적용 위치 (`사용자 관리` MenuItem) |
| `src/admin/UserManagementPage.tsx` | PocketBase users 콜렉션 사용 패턴 (line 55) |
| `src/auth/AuthContext.tsx` | `useAuth().user` 로 admin 판정 |
| `src/lib/pocketbase.ts` | `pb` 클라이언트 |
| `src/i18n/locales/ko.ts`, `en.ts` | 신규 키 |

---

## 적용 규칙 (스킬 요약)

### 코드 품질
- **응집도**: `usePendingUsersCount` 훅을 `src/admin/usePendingUsersCount.ts` 에 신규 — admin 도메인 안에 둠
- **예측 가능성**: 훅 반환값은 `{ count, refetch }` 정도로 단순 유지

### React 최적화
- 헤더 마운트 시 1회 fetch + 5초 polling 또는 PB realtime 구독 (트래픽 비용 vs UX 트레이드오프)
- 본 push 에서는 우선 마운트 시 1회만 fetch + 사용자 관리 페이지에서 status 변경 시 호출되는 invalidate 콜백 노출 (단순)
- 배지는 `count > 0 && <span ...>` 조건부 렌더 (`rendering-conditional-render`)

### 폴더 구조
- 도메인 전용 훅 → `src/admin/usePendingUsersCount.ts`

---

## 관련 파일

수정 대상:
- `src/common/MainHeader.tsx` — admin 메뉴에 배지 추가
- `src/i18n/locales/ko.ts`, `en.ts` — 키 추가 (선택, aria-label 정도)

신규 생성:
- `src/admin/usePendingUsersCount.ts` — 카운트 훅
- `test/admin/usePendingUsersCount.test.tsx` — 단위 테스트
- `src/common/HeaderBadge.tsx` (선택) — 재사용 가능한 카운트 배지 컴포넌트

---

## 작업

- [ ] **3.0 사용자 관리 승인 대기 배지 (Push 3)**

  - [ ] **3.1 `usePendingUsersCount` 훅 신설**
    **작업 상세:**
    ```ts
    export const usePendingUsersCount = () => {
      const { user } = useAuth();
      const [count, setCount] = useState(0);

      const refetch = useCallback(async () => {
        if (user?.role !== 'admin') {
          setCount(0);
          return;
        }
        try {
          const list = await pb.collection('users').getList(1, 1, {
            filter: 'status = "pending"',
            fields: 'id',
          });
          setCount(list.totalItems);
        } catch {
          setCount(0);
        }
      }, [user?.role]);

      useEffect(() => { void refetch(); }, [refetch]);
      return { count, refetch };
    };
    ```
    - admin 일 때만 fetch
    - PocketBase 가 `totalItems` 를 응답에 포함 → page=1, perPage=1 로 카운트만
    **참조:** `src/admin/UserManagementPage.tsx:55-58` (filter pattern)
    - [ ] 3.1.T1 mock pb 로 admin / non-admin / 0 / 5 케이스
    - [ ] 3.1.T2 `npm test test/admin`

  - [ ] **3.2 `MainHeader` 에 배지 표시**
    **작업 상세:**
    - `MainHeader` 안에서 `usePendingUsersCount()` 호출
    - 사용자 관리 `NavBar.MenuItem` 의 children 에 배지 span 추가:
      ```tsx
      <NavBar.MenuItem ...>
        <FontAwesomeIcon icon={usersIcon} /> {t('header.userManagement')}
        {count > 0 && (
          <span
            aria-label={t('header.userManagement.pendingBadge', { count })}
            className="ml-1 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white"
          >
            {count}
          </span>
        )}
      </NavBar.MenuItem>
      ```
    - 신규 i18n 키:
      - `header.userManagement.pendingBadge`: `대기 {count}명` (ko) / `{count} pending` (en)
    **참조:** `src/common/MainHeader.tsx:34-40`
    - [ ] 3.2.T1 MainHeader 테스트 — admin + count 5 → `5` + aria-label, count 0 → 배지 없음, non-admin → 메뉴 자체 없음
    - [ ] 3.2.T2 `npm test test/common/MainHeader`

---

## 완료 기준

- [ ] 어드민 로그인 시 헤더의 `사용자 관리` 메뉴 우측 상단에 빨간 동그란 카운트 배지
- [ ] 카운트 0 일 때 배지 비표시
- [ ] 비-admin 에게는 메뉴 자체가 안 보임 (회귀 없음)
- [ ] 배지 aria-label 로 스크린리더 지원
- [ ] `npx tsc --noEmit` + 전체 테스트 통과
