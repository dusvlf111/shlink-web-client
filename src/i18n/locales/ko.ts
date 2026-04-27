export const koMessages = {
  // 공통 / 헤더
  'header.settings': '설정',
  'header.userManagement': '사용자 관리',
  'header.userManagement.pendingBadge': '승인 대기 {count}명',
  'header.logout': '로그아웃',
  'header.languageToggle': '언어',

  // 좌측 사이드바 — 단축링크 영역
  'sidebar.section.shortUrls': '단축 링크',
  'sidebar.shortUrls.overview': '대시보드',
  'sidebar.shortUrls.list': '단축 링크 목록',
  'sidebar.shortUrls.create': '단축 링크 만들기',
  'sidebar.shortUrls.tags': '태그 관리',
  'sidebar.shortUrls.domains': '도메인 관리',

  // 좌측 사이드바 — UTM 영역
  'sidebar.section.utm': 'UTM 도구',
  'sidebar.utm.builder': 'UTM 빌더',
  'sidebar.utm.bulk': 'UTM 벌크 생성',
  'sidebar.utm.templates': 'UTM 템플릿 관리',
  'sidebar.utm.tags': 'UTM 태그 관리',

  // UTM 빌더 페이지
  'utm.builder.title': 'UTM 빌더',
  'utm.builder.baseUrl.label': '기본 URL',
  'utm.builder.baseUrl.placeholder': '예) https://example.com/path',
  'utm.builder.fields.source': '캠페인 소스 (utm_source)',
  'utm.builder.fields.medium': '캠페인 매체 (utm_medium)',
  'utm.builder.fields.campaign': '캠페인 이름 (utm_campaign)',
  'utm.builder.fields.term': '캠페인 키워드 (utm_term)',
  'utm.builder.fields.content': '캠페인 콘텐츠 (utm_content)',
  'utm.builder.result.title': '생성된 URL',
  'utm.builder.copy': '복사',
  'utm.builder.copied': '복사됨',
  'utm.builder.saveTemplate': '템플릿으로 저장',
  'utm.builder.openCreate': '단축링크 만들기',

  // UTM 벌크 생성 페이지
  'utm.bulk.title': 'UTM 벌크 생성',
  'utm.bulk.step1.title': '1. 기본 URL 입력',
  'utm.bulk.step1.placeholder': '예) https://example.com/path',
  'utm.bulk.step1.help': '선택한 템플릿의 utm_* 값을 자동으로 붙여 여러 URL을 한 번에 만듭니다.',
  'utm.bulk.overrideSection.title': '1.5 이번 캠페인 정보 (선택)',
  'utm.bulk.overrideSection.help': '비워두면 템플릿에 저장된 값이 그대로 사용됩니다. 입력하면 모든 선택 템플릿에 일괄 적용됩니다.',
  'utm.bulk.override.campaign.label': '캠페인 (utm_campaign)',
  'utm.bulk.override.campaign.placeholder': '예) mktchl3_dday',
  'utm.bulk.override.term.label': '키워드 (utm_term)',
  'utm.bulk.override.term.placeholder': '예) brand-search',
  'utm.bulk.override.content.label': '콘텐츠 (utm_content)',
  'utm.bulk.override.content.placeholder': '예) banner-top',
  'utm.bulk.step2.title': '2. 템플릿 선택',
  'utm.bulk.step2.selectAll': '전체 선택',
  'utm.bulk.step2.deselectAll': '전체 해제',
  'utm.bulk.step2.empty': '저장된 템플릿이 없습니다.',
  'utm.bulk.step2.gotoTemplates': '템플릿 관리로 이동',
  'utm.bulk.step3.title': '3. 생성 결과',
  'utm.bulk.step3.empty': '기본 URL을 입력하고 템플릿을 선택한 뒤 만들기 버튼을 눌러주세요.',
  'utm.bulk.action.generate': '만들기',
  'utm.bulk.action.makeShortUrls': '한번에 단축링크 만들기',
  'utm.bulk.action.makingShortUrls': '단축링크 만드는 중...',
  'utm.bulk.action.copyAll': '전체 복사',
  'utm.bulk.action.copiedAll': '전체 복사됨',
  'utm.bulk.options.title': '일괄 단축링크 옵션',
  'utm.bulk.options.titlePrefix.placeholder': '제목 (필수)',
  'utm.bulk.options.tags.placeholder': '태그 (필수, 쉼표 구분)',
  'utm.bulk.options.slugPrefix.placeholder': '슬러그 접두사 (선택)',
  'utm.bulk.options.tagsHelp': '추가 태그는 모든 항목에 공통으로 적용됩니다.',
  'utm.bulk.options.runBulk': '일괄 단축링크 만들기 실행',
  'utm.bulk.message.needBaseUrl': '기본 URL을 먼저 입력해 주세요.',
  'utm.bulk.message.needTemplate': '템플릿을 1개 이상 선택해 주세요.',
  'utm.bulk.message.invalidUrl': 'URL 형식을 확인해 주세요. 예) https://example.com/path',
  'utm.bulk.message.generated': '{count}개 URL이 생성되었습니다.',
  'utm.bulk.message.needGenerate': '먼저 만들기 버튼으로 URL을 생성해 주세요.',
  'utm.bulk.message.needTitle': '제목은 필수입니다.',
  'utm.bulk.message.needTags': '태그는 1개 이상 필수입니다.',
  'utm.bulk.message.creating': '단축링크를 만들고 있습니다...',
  'utm.bulk.message.serverMissing': '선택된 서버를 찾을 수 없습니다. 서버 경로에서 다시 시도해 주세요.',
  'utm.bulk.message.bulkResult': '단축링크 생성 완료: 성공 {success}건, 실패 {fail}건',
  'utm.bulk.message.bulkError': '단축링크 생성 중 오류가 발생했습니다. 서버 연결을 확인해주세요.',
  'utm.bulk.message.copyAllNeeded': '단축링크 만든 뒤 전체 복사가 가능합니다.',
  'utm.bulk.message.copyAllDone': '전체 복사가 완료되었습니다.',
  'utm.bulk.row.copyShort': '단축 URL 복사',
  'utm.bulk.row.copyUtm': 'UTM URL 복사',
  'utm.bulk.row.openCreate': '단축링크 만들기',
  'utm.bulk.row.shortLabel': '단축 URL',
  'utm.bulk.row.errorPrefix': '단축링크 생성 실패',

  // UTM 템플릿 관리
  'utm.template.title': 'UTM 템플릿 관리',

  // UTM 태그 관리
  'utm.tag.title': 'UTM 태그 관리',

  // 홈 (서버 리스트)
  'home.title': '서버 리스트',
  'home.subtitle': '서버를 클릭해 단축 링크 관리를 시작하세요.',
  'home.empty.title': '등록된 서버가 없습니다.',
  'home.empty.action': '서버 추가하기',
  'home.learnMore': 'Shlink에 대해 더 알아보기',
  'home.editHint': '서버 정보를 수정하려면 서버 설정 메뉴를 이용하세요.',

  // 언어 옵션
  'language.ko': '한국어',
  'language.en': 'English',
} as const;

export type MessageKey = keyof typeof koMessages;
export type Messages = Record<MessageKey, string>;
