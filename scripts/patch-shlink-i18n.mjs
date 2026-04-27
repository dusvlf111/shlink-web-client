/**
 * Patches @shlinkio/shlink-web-component built bundle so its user-facing
 * English labels show up in Korean. The package itself ships English-only,
 * and we cannot fork it cheaply, so we do a build-time literal replacement
 * on the published JS bundle.
 *
 * Run automatically via the `postinstall` script. Idempotent.
 *
 * After patching we also wipe Vite's optimized-dependency cache so the
 * next dev server / build picks up the fresh source instead of serving
 * the previously pre-bundled English copy out of node_modules/.vite/.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const PKG_DIR = 'node_modules/@shlinkio/shlink-web-component/dist';
const VITE_CACHE = 'node_modules/.vite';

// Order matters — longer phrases first so they win before their shorter
// substrings get replaced. All entries are exact JS string literals as they
// appear in the bundled JS, so the match is unambiguous.
const REPLACEMENTS = [
  // ===== Page titles & section headings =====
  ['"Recently created URLs"', '"최근 만든 단축 링크"'],
  ['"Create a short URL"', '"단축 링크 만들기"'],
  ['"Create short URL"', '"단축 링크 만들기"'],
  ['"Edit short URL"', '"단축 링크 편집"'],
  ['"Delete short URL"', '"단축 링크 삭제"'],
  ['"Invalid short URL redirect"', '"잘못된 단축 링크 리다이렉트"'],
  ['"Invalid short URL"', '"잘못된 단축 링크"'],
  ['"Customize the short URL"', '"단축 링크 사용자 설정"'],
  ['"List short URLs"', '"단축 링크 목록"'],
  ['"All short URLs"', '"전체 단축 링크"'],
  ['"Manage tags"', '"태그 관리"'],
  ['"Edit tag"', '"태그 편집"'],
  ['"Delete tag"', '"태그 삭제"'],
  ['"Manage domains"', '"도메인 관리"'],
  ['"Back to domains list"', '"도메인 목록으로"'],
  ['"All domains"', '"전체 도메인"'],
  ['"Default domain"', '"기본 도메인"'],
  ['"Existing domains"', '"등록된 도메인"'],
  ['"Domain status"', '"도메인 상태"'],
  ['"Configure behavior"', '"동작 설정"'],
  ['"Default redirect"', '"기본 리다이렉트"'],
  ['"Base URL"', '"기본 URL"'],
  ['"Base path redirect"', '"기본 경로 리다이렉트"'],
  ['"Regular 404"', '"일반 404"'],
  ['"Orphan visits"', '"삭제된 링크 방문"'],
  // Earlier versions of this script translated Orphan visits to "고아 방문";
  // upgrade those installs to the friendlier wording.
  ['"고아 방문"', '"삭제된 링크 방문"'],
  ['"Orphan visits type:"', '"삭제된 링크 방문 종류:"'],
  ['"Non-orphan visits"', '"일반 방문"'],
  ['"Delete visits."', '"방문 기록 삭제."'],
  ['"Delete visits"', '"방문 기록 삭제"'],

  // ===== Short URL form =====
  ['"URL to be shortened"', '"원본 URL"'],
  ['"Customize the short URL slug"', '"단축 코드를 직접 입력"'],
  ['"Custom slug"', '"사용자 슬러그"'],
  ['"Custom domain"', '"사용자 도메인"'],
  ['"Use a custom domain"', '"사용자 도메인 사용"'],
  ['"Add tags to the URL"', '"태그 추가"'],
  ['"Forward query params on redirect"', '"리다이렉트 시 쿼리 전달"'],
  ['"Validate URL"', '"URL 유효성 검사"'],
  ['"Find if exists"', '"있으면 그대로 반환"'],
  ['"Maximum visits"', '"최대 방문 수"'],
  ['"Limit access to the short URL"', '"단축 링크 접근 제한"'],
  ['"Enabled since"', '"활성 시작"'],
  ['"Enabled until"', '"활성 종료"'],
  ['"Crawlable"', '"크롤러 허용"'],
  ['"Read-only"', '"읽기 전용"'],
  ['"Forward query string"', '"쿼리 전달"'],
  ['"Advanced options"', '"고급 옵션"'],
  ['"Extra checks"', '"추가 검증"'],
  ['"Created at"', '"생성 시각"'],
  ['"Date created"', '"생성일"'],

  // ===== Filters / search / sorting =====
  ['"Search..."', '"검색..."'],
  ['"Search"', '"검색"'],
  ['"Filter by excluded tag"', '"제외 태그로 필터"'],
  ['"Filter by tag"', '"태그로 필터"'],
  ['"Filter"', '"필터"'],
  ['"Group by"', '"묶음 기준"'],
  ['"Sort by"', '"정렬 기준"'],
  ['"After date"', '"이후 날짜"'],
  ['"Before date"', '"이전 날짜"'],
  ['"After"', '"이후"'],
  ['"Before"', '"이전"'],
  ['"All visits"', '"전체 방문"'],
  ['"Compare with previous period"', '"이전 기간과 비교"'],
  ['"Close compare"', '"비교 닫기"'],
  ['"Exclude enabled in the past"', '"과거 활성화 제외"'],
  ['"Exclude potential bots"', '"봇 가능성 제외"'],
  ['"Exclude with visits reached"', '"방문 한도 도달 제외"'],
  ['"Including"', '"포함"'],
  ['"Ignore visits from bots"', '"봇 방문 무시"'],
  ['"Including bots"', '"봇 포함"'],
  ['"Excluding bots"', '"봇 제외"'],
  ['"Clear pagination"', '"페이지 초기화"'],
  ['"Add condition"', '"조건 추가"'],
  ['"Any value query param"', '"모든 값 쿼리"'],
  ['"Any desktop device"', '"모든 데스크톱"'],
  ['"Any mobile device"', '"모든 모바일"'],
  ['"Device type"', '"기기 종류"'],
  ['"Direct"', '"직접 유입"'],

  // ===== Common actions =====
  ['"See all"', '"전체 보기"'],
  ['"Submit"', '"등록"'],
  ['"Save"', '"저장"'],
  ['"Cancel"', '"취소"'],
  ['"Delete"', '"삭제"'],
  ['"Edit"', '"편집"'],
  ['"Apply"', '"적용"'],
  ['"Reset"', '"초기화"'],
  ['"Discard"', '"버리기"'],
  ['"Confirm"', '"확인"'],
  ['"Loading..."', '"불러오는 중..."'],
  ['"Deleting..."', '"삭제 중..."'],
  ['"Exporting..."', '"내보내는 중..."'],
  ['"Click to copy"', '"클릭하여 복사"'],
  ['"Copy data URI"', '"data URI 복사"'],
  ['"Click again to confirm"', '"한 번 더 클릭하여 확인"'],
  ['"Expand"', '"펼치기"'],
  ['"Collapse"', '"접기"'],
  ['"Default"', '"기본값"'],
  ['"More"', '"더 보기"'],
  ['"Settings"', '"설정"'],
  ['"Options"', '"옵션"'],
  ['"Yes"', '"예"'],
  ['"No"', '"아니오"'],
  ['"Info"', '"안내"'],
  ['"Great!"', '"완료"'],
  ['"Congratulations!"', '"성공"'],
  ['"Caution!"', '"주의"'],
  ['"Danger zone"', '"위험 영역"'],

  // ===== Visits page sections =====
  ['"By time"', '"시간별"'],
  ['"By context"', '"컨텍스트"'],
  ['"By location"', '"위치"'],
  ['"Total visits"', '"총 방문"'],
  ['"Visits over time"', '"기간별 방문"'],
  ['"Visits per browser"', '"브라우저별 방문"'],
  ['"Visits per OS"', '"OS별 방문"'],
  ['"Visits per country"', '"국가별 방문"'],
  ['"Visits per city"', '"도시별 방문"'],
  ['"Referrer"', '"유입 출처"'],
  ['"Referers"', '"유입 출처"'],
  ['"Country name"', '"국가"'],
  ['"City name"', '"도시"'],
  ['"Country"', '"국가"'],
  ['"City"', '"도시"'],
  ['"Cities"', '"도시"'],
  ['"Countries"', '"국가"'],
  ['"Browsers"', '"브라우저"'],
  ['"User agent"', '"User Agent"'],
  ['"Operating systems"', '"운영체제"'],
  ['"Day"', '"일"'],
  ['"Hour"', '"시간"'],
  ['"Week"', '"주"'],
  ['"Month"', '"월"'],
  ['"Year"', '"연"'],

  // ===== Settings page =====
  ['"Short URLs form"', '"단축 링크 폼"'],
  ['"Real-time updates"', '"실시간 갱신"'],
  ['"Real-time updates interval"', '"갱신 주기"'],
  ['"Short URLs creation"', '"단축 링크 생성"'],
  ['"Short URLs list"', '"단축 링크 목록"'],
  ['"User interface"', '"사용자 인터페이스"'],
  ['"QR codes"', '"QR 코드"'],
  ['"QR code"', '"QR 코드"'],
  ['"General"', '"일반"'],
  ['"Language"', '"언어"'],
  ['"Theme"', '"테마"'],
  ['"Dark"', '"다크"'],
  ['"Light"', '"라이트"'],

  // ===== Sidebar / nav =====
  ['"Overview"', '"대시보드"'],

  // ===== Tables / labels (after combinations above so we don't break "Short URLs") =====
  ['"Short URLs"', '"단축 링크"'],
  ['"Visits"', '"방문"'],
  ['"Tags"', '"태그"'],
  ['"Title"', '"제목"'],
  ['"Long URL"', '"원본 URL"'],
  ['"Short URL"', '"단축 링크"'],
  ['"Domains"', '"도메인"'],
  ['"Domain"', '"도메인"'],
  ['"Tag"', '"태그"'],
  ['"List"', '"목록"'],
  ['"Date"', '"날짜"'],
  ['"Stats"', '"통계"'],
  ['"Status"', '"상태"'],
  ['"Actions"', '"동작"'],
  ['"Name"', '"이름"'],
  ['"Description"', '"설명"'],
  ['"Tag is empty"', '"태그가 비어 있습니다"'],
  ['"Tag name"', '"태그 이름"'],

  // ===== Filter / dropdown / chart toggles =====
  ['"Show all locations"', '"모든 위치 표시"'],
  ['"Show locations in current page"', '"현재 페이지 위치만 표시"'],
  ['"Show in map"', '"지도에 표시"'],
  ['"Show numbers"', '"번호 표시"'],
  ['"Reset to defaults"', '"기본값으로 초기화"'],
  ['"Toggle sidebar"', '"사이드바 토글"'],
  ['"Selected"', '"선택됨"'],
  ['"Is selected"', '"선택됨"'],
  ['"Is bot"', '"봇 여부"'],
  ['"Is default domain"', '"기본 도메인"'],
  ['"New domain"', '"새 도메인"'],
  ['"Main options"', '"주요 옵션"'],
  ['"No redirect"', '"리다이렉트 없음"'],
  ['"No results found"', '"결과 없음"'],
  ['"No tags found"', '"태그 없음"'],
  ['"No tags"', '"태그 없음"'],
  ['"Saving..."', '"저장 중..."'],
  ['"Deleting tag..."', '"태그 삭제 중..."'],
  ['"Make it crawlable"', '"크롤러 허용"'],
  ['"Save rules"', '"규칙 저장"'],
  ['"Redirect rule"', '"리다이렉트 규칙"'],
  ['"Add conditions..."', '"조건 추가..."'],
  ['"Remove condition"', '"조건 제거"'],
  ['"Query param"', '"쿼리 파라미터"'],
  ['"Valueless query param"', '"값 없는 쿼리 파라미터"'],
  ['"IP address"', '"IP 주소"'],
  ['"Real time updates not enabled"', '"실시간 갱신 비활성"'],
  ['"Referrer name"', '"유입 출처"'],
  ['"Referrers"', '"유입 출처"'],
  ['"Region"', '"지역"'],
  ['"Today"', '"오늘"'],
  ['"Yesterday"', '"어제"'],
  ['"Previous period"', '"이전 기간"'],
  ['"Since"', '"시작"'],
  ['"Until"', '"종료"'],
  ['"What does this mean?"', '"이게 무슨 뜻인가요?"'],
  ['"With"', '"포함"'],
  ['"Without"', '"제외"'],
  ['"Use existing URL if found"', '"있으면 기존 URL 반환"'],
  ['"Unknown"', '"알 수 없음"'],
  ['"Visits list"', '"방문 목록"'],
  ['"Visits amount"', '"방문 수"'],
  ['"Visited URL"', '"방문 URL"'],
  ['"Visited URLs"', '"방문 URL 목록"'],
  ['"Go back"', '"뒤로"'],
  ['"Short code length"', '"단축 코드 길이"'],
  ['"Potentially a visit from a bot or crawler"', '"봇/크롤러로 추정되는 방문"'],
  ['"Short URL properly edited."', '"단축 링크가 수정되었습니다."'],
  ['"Redirect rules properly saved."', '"리다이렉트 규칙이 저장되었습니다."'],
  ['"Something went wrong while loading short URLs :("', '"단축 링크를 불러오지 못했습니다."'],
  ['"There are no visits matching current filter"', '"조건에 맞는 방문이 없습니다."'],
  ['"This short URL has no dynamic redirect rules"', '"이 단축 링크에는 리다이렉트 규칙이 없습니다."'],
  ['"Could not calculate previous period because selected one does not have a strictly defined start date."', '"선택한 기간의 시작일이 명확하지 않아 이전 기간을 계산할 수 없습니다."'],
  ['"This action cannot be undone. Once you have deleted it, all the visits stats will be lost."', '"이 작업은 되돌릴 수 없습니다. 삭제 후 모든 방문 통계가 사라집니다."'],
  ['"Configure dynamic conditions that will be checked at runtime."', '"실행 시점에 검사될 동적 조건을 설정하세요."'],
  ['"Conditions:"', '"조건:"'],
  ['"Long URL:"', '"원본 URL:"'],
  ['"Mode:"', '"모드:"'],
  ['"Visits:"', '"방문:"'],
  ['"Short URLs:"', '"단축 링크:"'],
  ['"Bots:"', '"봇:"'],

  // ===== Short URL row dropdown items =====
  // The bundle stores these with a leading space because they sit next to a
  // FontAwesomeIcon: <span><Icon/> Label</span>. Match the exact literal.
  ['" Visit stats"', '" 방문 통계"'],
  ['" Compare visits"', '" 방문 비교"'],
  ['" Edit short URL"', '" 단축 링크 편집"'],
  ['" Edit redirects"', '" 리다이렉트 편집"'],
  ['" Manage redirect rules"', '" 리다이렉트 규칙 관리"'],
  ['" Delete short URL"', '" 단축 링크 삭제"'],
  ['" Delete tag"', '" 태그 삭제"'],
  ['" QR code"', '" QR 코드"'],
  ['" Short URLs"', '" 단축 링크"'],
  ['" Add rule"', '" 규칙 추가"'],
  ['" Clear tags"', '" 태그 초기화"'],
  ['" Edit"', '" 편집"'],
  ['" All"', '" 전체"'],
  ['" Any"', '" 모두"'],

  // ===== Table column headers =====
  // Stored as columnName="Created at:" in the table primitives.
  ['columnName: "Created at:"', 'columnName: "생성 시각:"'],
  ['columnName: "Created at"', 'columnName: "생성 시각"'],
  ['columnName: "Short URL"', 'columnName: "단축 링크"'],
  ['columnName: "Long URL"', 'columnName: "원본 URL"'],
  ['columnName: "Title"', 'columnName: "제목"'],
  ['columnName: "Tags"', 'columnName: "태그"'],
  ['columnName: "Visits"', 'columnName: "방문"'],
  ['columnName: "Domain"', 'columnName: "도메인"'],
  ['columnName: "Status"', 'columnName: "상태"'],
  ['"Created at "', '"생성 시각 "'],

  // ===== Filter dropdown text fragments (leading space variants) =====
  ['" Tags filtering mode"', '" 태그 필터 모드"'],
  ['" Excluding bots"', '" 봇 제외"'],
  ['" Including bots"', '" 봇 포함"'],

  // ===== Settings page (chunk file: dist/index-*.js) =====
  ['"Columns to show in visits table:"', '"방문 테이블에 표시할 컬럼:"'],
  ['"Compare visits with previous period."', '"이전 기간과 방문 비교."'],
  ['"Default error correction"', '"기본 오류 정정"'],
  ['"Default interval to load on visits sections:"', '"방문 섹션 기본 기간:"'],
  ['"Default ordering for short URLs list:"', '"단축 링크 목록 기본 정렬:"'],
  ['"Default ordering for tags list:"', '"태그 목록 기본 정렬:"'],
  ['"Enable or disable real-time updates."', '"실시간 갱신 사용/해제."'],
  ['"Real-time updates frequency (in minutes):"', '"실시간 갱신 주기 (분):"'],
  ['"Request confirmation before deleting a short URL."', '"단축 링크 삭제 전 확인 요청."'],
  ['"Tag suggestions search mode:"', '"태그 제안 검색 방식:"'],
  ['"Use dark theme."', '"다크 테마 사용."'],
  ['"Suggest tags including input"', '"입력 포함 태그 제안"'],
  ['"Suggest tags starting with input"', '"입력으로 시작하는 태그 제안"'],
  ['"Make all new short URLs forward their query params to the long URL."', '"새 단축 링크의 쿼리 파라미터를 원본 URL로 전달."'],
  ['"The visits coming from potential bots will be "', '"봇으로 추정되는 방문은 "'],
  ['"The list of suggested tags will contain those "', '"제안된 태그 목록은 다음 항목을 포함합니다 "'],
  ['"Real-time updates are currently being "', '"실시간 갱신 현재 상태: "'],
  ['"The initial state of the "', '"기본 상태: "'],
  ['"Updates will be reflected in the UI every "', '"UI 갱신 주기 "'],
  ['"Updates will be reflected in the UI as soon as they happen."', '"변경 사항이 즉시 UI에 반영됩니다."'],
  ['"When deleting a short URL, confirmation "', '"단축 링크 삭제 시 확인 "'],
  ['"When loading visits, previous period "', '"방문 데이터 로드 시 이전 기간 "'],
  ['"When downloading a QR code, it will use "', '"QR 코드 다운로드 시 사용 "'],
  ['"QR codes will initially use "', '"QR 코드 초기 설정 "'],
  ['"QR codes will initially have a "', '"QR 코드 초기값 "'],
  ['"QR codes will be initially generated with "', '"QR 코드 초기 생성 "'],
  ['"QR codes will be initially generated with a "', '"QR 코드 초기 생성 "'],
  ['"Default background color:"', '"기본 배경색:"'],
  ['"Default color:"', '"기본 색상:"'],
  ['"Default dimensions:"', '"기본 크기:"'],
  ['"Default margin:"', '"기본 여백:"'],
  ['"Colors"', '"색상"'],
  ['"Format"', '"형식"'],
  ['"Immediate"', '"즉시"'],
  ['"Last 7 days"', '"최근 7일"'],
  ['"Last 30 days"', '"최근 30일"'],
  ['"Last 90 days"', '"최근 90일"'],
  ['"Last 180 days"', '"최근 180일"'],
  ['"Last 365 days"', '"최근 365일"'],
  ['"Potential bot"', '"봇 가능성"'],
  ['"User Agent"', '"User Agent"'],
];

const isJsBundle = (file) => /\.(?:js|mjs)$/.test(file) && !file.endsWith('.map');

const patchFile = (filePath) => {
  const original = readFileSync(filePath, 'utf8');
  let next = original;
  let replaced = 0;
  for (const [from, to] of REPLACEMENTS) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
      replaced += 1;
    }
  }
  if (next !== original) {
    writeFileSync(filePath, next, 'utf8');
  }
  return replaced;
};

const invalidateViteCache = () => {
  if (!existsSync(VITE_CACHE)) {
    return false;
  }
  try {
    rmSync(VITE_CACHE, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.warn(`[patch-shlink-i18n] could not wipe ${VITE_CACHE}:`, error?.message ?? error);
    return false;
  }
};

const run = () => {
  if (!existsSync(PKG_DIR)) {
    console.warn(`[patch-shlink-i18n] ${PKG_DIR} not found, skipping.`);
    return;
  }
  const files = readdirSync(PKG_DIR).filter(isJsBundle);
  let totalReplacements = 0;
  for (const file of files) {
    totalReplacements += patchFile(join(PKG_DIR, file));
  }
  const cacheWiped = invalidateViteCache();
  console.log(
    `[patch-shlink-i18n] applied ${totalReplacements} replacements across ${files.length} bundle files.`
    + (cacheWiped ? ' Vite optimized-deps cache cleared.' : ''),
  );
};

run();
