# Architecture — tazagame-client

이 문서는 프로젝트의 **폴더 구조(FSD)** 와 **다국어(i18n) 전략**을 설명합니다.
AI 에이전트용 규칙 체크리스트는 [`CLAUDE.md`](./CLAUDE.md)를, 스킬 자동 활성화 규칙은 [`.claude/skills/folder-structure/SKILL.md`](./.claude/skills/folder-structure/SKILL.md)를 참고하세요.

---

## 1. 전체 개요

이 프로젝트는 **Feature-Sliced Design (FSD)** 컨벤션을 따릅니다.
코드를 "수평 도메인"이 아니라 **수직 계층(Layer)** 으로 먼저 나누고, 그 안에서 도메인(Slice)과 기술 세그먼트(Segment)로 내려가는 구조입니다.

```
┌──────────────────────────────────────────────┐
│  app      프로바이더 · 라우터 · i18n 초기화   │ ← 가장 위 (모두 import 가능)
├──────────────────────────────────────────────┤
│  pages    라우트 단위 화면 조립               │
├──────────────────────────────────────────────┤
│  widgets  독립 UI 블록 (헤더, 게임보드 등)    │
├──────────────────────────────────────────────┤
│  features 사용자 상호작용 / 유스케이스        │
├──────────────────────────────────────────────┤
│  entities 비즈니스 엔티티 (user, game, word)  │
├──────────────────────────────────────────────┤
│  shared   도메인 지식 없는 완전 재사용 코드   │ ← 가장 아래 (어디서나 import 가능)
└──────────────────────────────────────────────┘
            ↑ import는 위에서 아래로만
```

**기본 규칙 한 줄 요약:**
> **상위 계층만 하위 계층을 import할 수 있다. 같은 계층의 다른 slice는 직접 import하지 않는다.**

---

## 2. 디렉토리 구조

```
src/
├── app/                     # 앱 초기화
│   ├── providers/
│   │   ├── router/          #   BrowserRouter + Routes 정의
│   │   └── i18n/            #   i18next 인스턴스 초기화
│   └── styles/              #   글로벌 CSS, Tailwind 진입점
│
├── pages/                   # 라우트 = 페이지
│   ├── home/
│   └── game/
│       ├── ui/              #   GamePage.tsx
│       └── index.ts
│
├── widgets/                 # 독립 UI 블록
│   ├── header/
│   └── game-board/
│       ├── ui/
│       ├── model/
│       └── index.ts
│
├── features/                # 유스케이스 단위
│   ├── typing-input/
│   │   ├── ui/              #   TypingInput.tsx
│   │   ├── model/           #   useTyping.ts, 상태/로직
│   │   ├── lib/             #   이 feature 전용 유틸
│   │   ├── i18n/            #   ko.json, en.json  ← ⭐ 번역 콜로케이션
│   │   └── index.ts
│   └── auth-by-email/
│
├── entities/                # 비즈니스 엔티티
│   ├── user/
│   │   ├── ui/              #   ProfileCard.tsx
│   │   ├── model/           #   user 타입, 스토어
│   │   ├── api/             #   user API
│   │   └── index.ts
│   └── word/
│
└── shared/                  # 완전 재사용 코드 (도메인 지식 X)
    ├── ui/                  #   Button, Input, Modal
    ├── lib/                 #   범용 유틸/훅
    ├── api/                 #   공용 API 클라이언트, 인터셉터
    ├── config/              #   env, 상수
    ├── i18n/                #   ⭐ i18n 인스턴스 + 공용 리소스
    │   ├── config.ts        #     지원 언어, 기본 언어
    │   └── locales/
    │       ├── ko/common.json
    │       └── en/common.json
    └── assets/              #   이미지, 폰트
```

---

## 3. 3단 계층 구조: Layer → Slice → Segment

### Layer (계층)

고정된 6개: `app`, `pages`, `widgets`, `features`, `entities`, `shared`.
계층은 **수직 의존 방향**을 정의합니다.

### Slice (슬라이스 = 도메인 폴더)

`app`과 `shared`를 제외한 모든 계층은 **slice**로 나뉩니다.
slice = 기능/도메인 단위 폴더입니다.

```
features/
├── typing-input/   ← 하나의 slice
├── auth-by-email/  ← 하나의 slice
└── leaderboard/    ← 하나의 slice
```

### Segment (세그먼트 = 기술 레이어)

slice 내부는 **기술 관점**으로 쪼갭니다. 필요한 것만 만듭니다.

| 세그먼트 | 역할 |
|---|---|
| `ui/` | React 컴포넌트 |
| `model/` | 상태, 훅, 스토어, 비즈니스 로직 |
| `api/` | 이 slice의 API 호출 |
| `lib/` | 이 slice 전용 헬퍼/유틸 |
| `config/` | 이 slice 전용 상수 |
| `i18n/` | 이 slice 전용 번역 리소스 |
| `index.ts` | **public API** — 외부에서 이것만 import |

---

## 4. Import 규칙

### ✅ 허용

```ts
// pages → features  (상위 → 하위)
import { TypingInput } from "@/features/typing-input";

// features → entities
import { User } from "@/entities/user";

// 어디서나 → shared
import { Button } from "@/shared/ui/button";

// slice 내부끼리는 segment 직접 import OK
import { useTyping } from "../model/useTyping";
```

### ❌ 금지

```ts
// ❌ 같은 계층의 다른 slice 직접 import
import { Something } from "@/features/leaderboard"; // from features/typing-input

// ❌ 하위 → 상위 import
import { TypingInput } from "@/features/typing-input"; // from entities/user

// ❌ slice 외부에서 segment 직접 import (public API 우회)
import { TypingInput } from "@/features/typing-input/ui/TypingInput";

// ❌ 상대 경로
import { Button } from "../../../shared/ui/button";
```

### Public API 패턴

모든 slice는 `index.ts`로 외부에 공개할 것만 노출합니다.

```ts
// features/typing-input/index.ts
export { TypingInput } from "./ui/TypingInput";
export { useTyping } from "./model/useTyping";
export type { TypingState } from "./model/types";
```

이렇게 하면 slice 내부 구조를 자유롭게 리팩토링해도 외부는 깨지지 않습니다.

---

## 5. 파일 배치 결정 플로우

새 코드를 만들 때 이 순서로 판단합니다.

```
┌─ 사용처가 몇 곳인가?
│
├─ 1~2곳  → 가장 가까운 slice 내부에 둔다 (콜로케이션 우선)
│
└─ 3곳 이상 → 다음 질문으로
     │
     ├─ 도메인 지식이 필요한가?
     │    YES → 상위 계층으로 승격 (entities → features → widgets)
     │    NO  → shared/ 로 이동
     │
     └─ 무엇인가?
          • 라우트 페이지 → pages/
          • 큰 UI 블록 → widgets/
          • 유스케이스 → features/
          • 도메인 모델 → entities/
          • 범용 UI/유틸 → shared/
```

### 3-rule (승격 규칙)

- 1번 사용: slice 안에 둔다
- 2번 사용: 그래도 둔다 (한쪽에서 import)
- **3번째 사용처가 생기면**: 상위 계층으로 이동 (파일 이동 + import 경로만 수정)

---

## 6. 예시: "타자 입력" 기능은 어디에?

```
features/typing-input/
├── ui/
│   ├── TypingInput.tsx      # 입력 컴포넌트
│   └── TypingInput.test.tsx
├── model/
│   ├── useTyping.ts         # 상태 훅
│   ├── types.ts             # TypingState 등
│   └── scoring.ts           # 점수 계산 로직
├── lib/
│   └── normalize-input.ts   # 입력 정규화 유틸
├── i18n/
│   ├── ko.json              # "game.typing.placeholder": "여기에 입력하세요"
│   └── en.json              # "game.typing.placeholder": "Type here"
└── index.ts                 # export { TypingInput, useTyping }
```

사용 측:
```tsx
// pages/game/ui/GamePage.tsx
import { TypingInput } from "@/features/typing-input";
import { GameBoard } from "@/widgets/game-board";

export function GamePage() {
  return (
    <>
      <GameBoard />
      <TypingInput />
    </>
  );
}
```

---

## 7. 다국어(i18n) 전략

> **원칙:** 사용자에게 노출되는 모든 텍스트는 코드에서 분리하여 번역 리소스로 관리합니다.
> 새 언어 추가 시 **코드 수정 없이 리소스 파일만 추가**하면 되도록 설계합니다.

### 라이브러리

- `react-i18next` + `i18next`
- 초기화: `src/app/providers/i18n/` 또는 `src/shared/i18n/`에서 단 1회

### 리소스 배치

**slice별 콜로케이션**이 기본입니다. 여러 slice가 공유하는 것만 `shared/i18n/`로 승격합니다.

```
features/typing-input/i18n/
├── ko.json
└── en.json

shared/i18n/locales/
├── ko/common.json    # 여러 곳에서 쓰는 공용 텍스트
└── en/common.json
```

### 네임스페이스 = slice 이름

```ts
// features/typing-input 에서
const { t } = useTranslation("typing-input");
t("placeholder"); // "여기에 입력하세요"
```

### 키 네이밍 규칙

**UI 위치가 아니라 의미(semantic)** 기준으로 점(`.`) 구분 계층형 키를 사용합니다.

```json
// ✅ 의미 기반
{
  "game.start.button": "시작하기",
  "game.result.score": "점수: {{score}}",
  "game.result.timeElapsed_one": "{{count}}초",
  "game.result.timeElapsed_other": "{{count}}초",
  "error.network.timeout": "네트워크 연결이 원활하지 않습니다"
}
```

```json
// ❌ 위치/스타일 기반 (재사용 불가)
{
  "topRightButton": "시작하기",
  "redText1": "점수: 100"
}
```

### 사용 예시

```tsx
import { useTranslation, Trans } from "react-i18next";

export function GameResult({ score }: { score: number }) {
  const { t } = useTranslation("game");
  return (
    <div>
      {/* 단순 */}
      <button>{t("start.button")}</button>

      {/* interpolation */}
      <p>{t("result.score", { score })}</p>

      {/* HTML 포함 → <Trans> 사용 */}
      <Trans i18nKey="result.shareCta" t={t}>
        결과를 <strong>공유</strong>하세요
      </Trans>
    </div>
  );
}
```

### 필수 규칙

| 규칙 | 설명 |
|---|---|
| ✅ 전부 `t()` | 단 한 글자라도 UI 문자열은 `t()` 호출. placeholder, aria-label, title, alt 포함 |
| ✅ 기본 언어 ko | 한국어가 원본, 다른 언어는 번역본 |
| ✅ 문장 단위 키 | 단어 조합이 아니라 **완성된 문장** 단위로 키 설계 |
| ✅ interpolation | `t("msg", { name })` — 절대 문자열 연결(`t("hi") + name`) 금지 |
| ✅ 복수형 | i18next `_one` / `_other` 접미사 활용 |
| ✅ Intl 사용 | 날짜/숫자/통화는 `Intl.NumberFormat`, `Intl.DateTimeFormat` 또는 i18next formatter |
| ❌ 하드코딩 | 컴포넌트 내 `"시작하기"` 같은 문자열 리터럴 금지 |
| ❌ 개발자 문자열 | 콘솔 로그, 에러 클래스명, 테스트 문자열은 i18n 대상 **아님** |

**판단 기준**: 엔드유저에게 보이는가? → 보이면 i18n, 안 보이면 하드코딩 OK.

---

## 8. 검증법 (Self-check)

작업을 마친 뒤 다음을 확인합니다.

1. **계층 독립성**: 한 slice 폴더를 통째로 지워도 다른 slice가 깨지지 않는가?
2. **수직 의존**: `shared/`가 상위 계층(`features/` 등)을 전혀 참조하지 않는가?
3. **public API**: slice 외부에서 `index.ts`가 아닌 segment 파일을 직접 import한 곳이 없는가?
4. **i18n 하드코딩**: `t(` 호출 밖에서 사용자에게 보이는 한국어/영어 문장이 없는가?
5. **alias**: 상대 경로 `../../` 를 써서 계층을 넘는 곳이 없는가?

---

## 9. 안티패턴

- ❌ 처음부터 `shared/ui/`에 컴포넌트 만들기 (먼저 slice에서 시작)
- ❌ 같은 계층 slice 직접 import — 둘 다 쓰는 곳이면 상위 계층으로 합칠 것
- ❌ slice 내부 파일을 외부에서 직접 import (public API 우회)
- ❌ 한 파일에 여러 컴포넌트/훅 섞기
- ❌ 사용처 1~2개인 코드를 미리 공용화 (premature abstraction)
- ❌ UI에 문자열 리터럴 하드코딩
- ❌ 레거시 경로(`src/components/`, `src/domain/`, `src/common/`) 생성

---

## 10. 관련 문서

| 문서 | 역할 |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | AI 에이전트용 규칙 체크리스트 (자동 로드) |
| [`.claude/skills/folder-structure/SKILL.md`](./.claude/skills/folder-structure/SKILL.md) | Claude Code 스킬 (파일 생성 시 자동 활성화) |
| [`.claude/roles/developer.md`](./.claude/roles/developer.md) | developer 에이전트의 작업 워크플로우 |
| 이 문서 (`ARCHITECTURE.md`) | 사람이 읽는 구조 설명 + 예시 |

구조/i18n 규칙을 바꿀 때는 **CLAUDE.md → ARCHITECTURE.md → SKILL.md** 순서로 일관되게 업데이트하세요.
