# PRD — Shlink Web Client 커스텀 서비스

## 개요

기존 shlink-web-client를 포크해 자체 서비스로 운영한다.
핵심 원칙: **기존 코드 최소 수정, 기능 추가 방식**으로 진행한다.

백엔드 인증/데이터 저장소는 **PocketBase**를 사용한다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | 기존 shlink-web-client (React + TypeScript) |
| 인증/DB | PocketBase (self-hosted) |
| PocketBase 스키마 배포 | JSON export/import (컬렉션 one-shot 복붙) |
| Shlink 백엔드 | 기존 shlink 서버 유지 |

---

## 기능 명세

### F1. 로그인 / 인증

**목표:** 앱 진입 시 PocketBase 인증을 거쳐야 shlink 기능에 접근 가능하다.

- 앱 최초 진입 시 로그인 페이지 표시 (shlink 기존 라우팅 앞에 auth guard 추가)
- 로그인 방식: 이메일 + 비밀번호
- 회원가입: 이메일 + 비밀번호만 입력, 이메일 인증 없음
  - 가입 직후 상태: `pending` (비활성)
  - 어드민이 승인해야 `active`로 전환되어 로그인 가능
- 로그인 성공 시 PocketBase JWT를 localStorage에 저장, 앱 전체에서 유지
- 로그아웃 시 토큰 삭제 후 로그인 페이지로 리다이렉트

**PocketBase 컬렉션: `users`**

| 필드 | 타입 | 설명 |
|------|------|------|
| email | email | 로그인 이메일 |
| password | password | 비밀번호 |
| role | select | `admin` \| `member` |
| status | select | `pending` \| `active` |
| name | text | 표시 이름 (선택) |

---

### F2. PocketBase 스키마 원클릭 배포

**목표:** PocketBase를 새로 설치할 때 JSON 하나를 붙여넣어 모든 컬렉션을 생성한다.

- `/pocketbase/schema.json` 파일에 전체 컬렉션 정의를 관리
- PocketBase Admin UI → Settings → Import collections → JSON 붙여넣기로 완료
- 포함 컬렉션: `users`, `utm_templates`, `utm_tags`

---

### F3. 어드민 — 사용자 관리

**목표:** 어드민이 가입 승인, 권한 변경, 계정 비활성화를 할 수 있다.

- 어드민 로그인 시 사이드바에 **"사용자 관리"** 메뉴 추가
- 기능:
  - 대기 중(pending) 사용자 목록 확인 및 **승인 / 거절**
  - 활성 사용자의 role 변경 (`admin` ↔ `member`)
  - 사용자 비활성화 (status → `inactive`)
- 일반 member는 이 메뉴 진입 불가 (라우트 가드)

---

### F4. UTM 빌더 메뉴

**목표:** UTM 파라미터가 붙은 긴 URL을 쉽게 만들고 복사한다.

사이드바에 **"UTM 빌더"** 메뉴 추가.

#### 4-1. UTM 링크 생성

입력 필드:
- 기본 URL
- utm_source (태그 선택 또는 직접 입력)
- utm_medium (태그 선택 또는 직접 입력)
- utm_campaign (태그 선택 또는 직접 입력)
- utm_term (선택, 태그 선택 또는 직접 입력)
- utm_content (선택, 태그 선택 또는 직접 입력)

결과:
- 생성된 UTM URL 실시간 미리보기
- **복사 버튼** (클립보드 복사)
- **"단축 링크 만들기" 버튼** → shlink의 링크 생성 페이지로 URL 파라미터와 함께 이동

#### 4-2. UTM 템플릿

- 자주 쓰는 UTM 조합을 템플릿으로 저장
- 템플릿 이름 + utm 필드 값 세트 저장
- 템플릿 선택 시 UTM 빌더 필드 자동 채움
- PocketBase 컬렉션 `utm_templates`에 저장 (사용자별)

**PocketBase 컬렉션: `utm_templates`**

| 필드 | 타입 | 설명 |
|------|------|------|
| user | relation | users |
| name | text | 템플릿 이름 |
| source | text | utm_source 기본값 |
| medium | text | utm_medium 기본값 |
| campaign | text | utm_campaign 기본값 |
| term | text | (선택) |
| content | text | (선택) |

#### 4-3. UTM 태그

- utm 파라미터 값을 태그로 저장하고 드롭다운으로 재사용
- 태그에는 카테고리 지정 가능 (source / medium / campaign / term / content)
- PocketBase 컬렉션 `utm_tags`에 저장

**PocketBase 컬렉션: `utm_tags`**

| 필드 | 타입 | 설명 |
|------|------|------|
| user | relation | users |
| category | select | `source` \| `medium` \| `campaign` \| `term` \| `content` |
| value | text | 태그 값 |

---

### F5. 통계 공개 공유 (읽기 전용 외부 링크)

**목표:** 로그인 없이 특정 단축링크의 통계 페이지만 외부에 공유할 수 있다.

- 어드민 또는 링크 소유자가 **공개 토큰**을 발급
- 발급된 토큰으로 접근 가능한 URL: `/public/stats/{shortCode}?token={token}`
- 해당 페이지는 인증 없이 통계만 열람 가능 (읽기 전용)
- 그 외 모든 페이지는 비로그인 시 접근 불가 (auth guard)
- 공개 토큰은 PocketBase `public_tokens` 컬렉션에 저장

**PocketBase 컬렉션: `public_tokens`**

| 필드 | 타입 | 설명 |
|------|------|------|
| short_code | text | shlink 단축 코드 |
| token | text | 랜덤 UUID |
| created_by | relation | users |
| expires_at | date | 만료일 (null=영구) |

---

## 구현 원칙

1. shlink-web-client 기존 소스 수정 최소화
2. 신규 기능은 별도 디렉토리(`src/auth/`, `src/utm/`, `src/admin/`)에 추가
3. PocketBase 연동 코드는 `src/lib/pocketbase.ts`에 집중 관리
4. 기존 shlink API 연동 코드는 건드리지 않음

---

## 구현 순서 (Phase)

| Phase | 내용 |
|-------|------|
| 1 | PocketBase 설치 + 스키마 JSON 작성 + auth guard + 로그인/회원가입 페이지 |
| 2 | 어드민 사용자 관리 메뉴 |
| 3 | UTM 빌더 메뉴 (태그, 템플릿, 복사, 단축링크 연동) |
| 4 | 통계 공개 공유 기능 |
