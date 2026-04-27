# PocketBase 콜렉션 적용 가이드

`schema.json` 은 본 프로젝트가 의존하는 PocketBase 콜렉션 정의입니다.
PocketBase 인스턴스에 직접 적용해야 통계 공유, 사용자 관리, 서버 설정 기능이 동작합니다.

## 적용 방법 (PocketBase Admin UI)

1. PocketBase Admin Panel 접속 — 예: `https://pocketbase-linkshortener.supabin.com/_/`
2. 좌측 메뉴 **Settings** → **Import collections** 클릭
3. 본 저장소의 `pocketbase/schema.json` 파일 내용을 통째로 붙여넣기
4. **Review** 단계에서 변경 요약을 확인
5. **Apply changes** 클릭 → 콜렉션이 갱신됨

## 콜렉션 요약

| 콜렉션 | 용도 |
|--------|------|
| `users` | 인증 + role(admin/member) + status(pending/active/inactive) |
| `utm_templates` | UTM 빌더에서 저장하는 템플릿 |
| `utm_tags` | UTM 카테고리별 태그(자동완성) |
| `server_configs` | Shlink 서버 등록 정보 (admin 만 쓰기) |
| `public_tokens` | 통계 공유 토큰 + 스냅샷 + 만료 |

## `public_tokens` 가 갖춰야 할 필드 (수동 추가 시)

이 프로젝트의 통계 공유 기능은 다음 필드가 모두 있어야 동작합니다:

- `short_code` (text, required)
- `token` (text, required)
- `created_by` (relation → users, required, cascadeDelete)
- `expires_at` (date, optional)
- `label` (text, optional, presentable)
- `server_id` (text, optional)
- `snapshot` (json, optional, maxSize 5MB)
- `snapshot_at` (date, optional)

### 필수 규칙

| Rule | 값 | 의미 |
|------|----|------|
| `listRule` | `@request.auth.id != '' && created_by = @request.auth.id` | 본인이 만든 토큰만 목록 조회 |
| `viewRule` | `(@request.auth.id != '' && created_by = @request.auth.id) || (@request.query.token != '' && @request.query.token = token && (expires_at = '' || expires_at > @now))` | 본인 OR 토큰 + 만료 전 외부 사용자 |
| `createRule` | `@request.auth.id != '' && @request.auth.role = 'admin'` | admin 만 발급 |
| `updateRule` / `deleteRule` | `@request.auth.id != '' && created_by = @request.auth.id` | 본인만 수정/종료 |

## 적용 안 됐을 때 증상

- 통계 공유 페이지에서 발급된 링크가 보이지 않음
- 단축링크 검색이 작동하지 않음 (서버 설정 권한 부재)
- 외부 공유 링크가 `not-found` 표시
- 어드민이 로그인했는데도 사용자 관리 카운트가 갱신 안 됨

이 경우 위 절차로 schema 를 다시 import 해 주세요.

## 자동화 옵션 (선택)

PocketBase 서버에 직접 파일 접근이 가능하면 `pb_migrations/` 디렉토리에
마이그레이션 JS 를 두는 방식을 선택할 수도 있습니다. 본 저장소는 호스팅된
PocketBase 인스턴스를 가정하므로 Admin UI 적용을 기본 흐름으로 안내합니다.
