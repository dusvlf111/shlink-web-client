# PRD: UTM 관리 좌측 네비 이동 + 벌크 생성 개선

> 원본 요청: `.claude/tasks/0427.md`
> 작성일: 2026-04-26

## 배경

마케팅팀이 UTM 빌더/벌크 생성 기능을 본격적으로 사용하기 시작.
현재 UI 구조와 벌크 생성 워크플로우에 대한 개선 요청 접수.

## 요구사항

### 1. UI 한국어 통일 (마케팅팀 친화 UI)

영어로 남아있는 UI 텍스트를 한국어로 변환.
마케팅팀이 영어 용어에 익숙하지 않으므로 더 친숙한 표현 사용.

### 2. UTM 관리 메뉴를 왼쪽 네비게이션으로 이동

**현재 구조 (문제점):**
- 우측 하단 floating 버튼(`UTM 관리`)으로 UTM 영역 진입
- UTM 페이지에서는 상단 탭 바(`UtmManagementMenu`)로 빌더/벌크/템플릿/태그 전환
- 일반 단축링크 메뉴와 단절된 별도 영역으로 느껴짐

**원하는 구조:**
- UTM 메뉴들이 다른 메뉴(단축 URL 목록, 태그 등)와 똑같이 **왼쪽 리스트(사이드바)**에 노출
- 별도 탭/플로팅 버튼으로 분리되지 않고 자연스럽게 통합된 메뉴로 인식

### 3. 벌크 생성에 campaign/term/content 즉석 입력 기능 추가

**배경:**
- `utm_source` / `utm_medium` = 마케팅 **채널** → 템플릿으로 저장하기 적합 (변하지 않음)
- `utm_campaign` / `utm_term` / `utm_content` = **그때그때 변경** 되는 캠페인 정보

**예시:**
```
template:  source=kakaotalk, medium=kakaotalk_judycommunity
campaign:  mktchl3_dday  (이번 주)
campaign:  mktchl3_d1    (다음 주)
campaign:  mktchl3_d2    (그 다음 주)
```

**원하는 동작:**
- 벌크 생성 페이지에서 campaign / term / content 를 **공통으로 한 번만 입력**
- 선택된 모든 템플릿에 동일하게 적용되어 URL 생성
- (선택값이 있으면 템플릿의 해당 필드를 오버라이드, 비어있으면 템플릿값 사용)

## 비기능 요구사항

- 기존 단일 빌더(`UtmBuilderPage`) 동작은 영향 없음
- 기존 템플릿 데이터 구조(`utm_templates` 콜렉션) 변경 없음
- 모바일 레이아웃 호환 유지

## 산출물

- Push 1: 좌측 네비 통합 + 한국어 UI 정리
- Push 2: 벌크 생성 campaign/term/content 즉석 입력 기능
