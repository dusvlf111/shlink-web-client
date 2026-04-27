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
// substrings get replaced.
const REPLACEMENTS = [
  // Page titles & headings
  ['"Recently created URLs"', '"최근 만든 단축 링크"'],
  ['"Create a short URL"', '"단축 링크 만들기"'],
  ['"List short URLs"', '"단축 링크 목록"'],
  ['"All short URLs"', '"전체 단축 링크"'],
  ['"Manage tags"', '"태그 관리"'],
  ['"Manage domains"', '"도메인 관리"'],
  ['"Orphan visits"', '"고아 방문"'],
  ['"Non-orphan visits"', '"일반 방문"'],

  // Short URL form
  ['"URL to be shortened"', '"원본 URL"'],
  ['"Custom slug"', '"사용자 슬러그"'],
  ['"Add tags to the URL"', '"태그 추가"'],
  ['"Advanced options"', '"고급 옵션"'],
  ['"Customize the short URL slug"', '"단축 코드를 직접 입력"'],
  ['"Use a custom domain"', '"사용자 도메인 사용"'],

  // Common actions
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

  // Sidebar / nav
  ['"Overview"', '"대시보드"'],

  // Visits page sections
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
  ['"Country"', '"국가"'],
  ['"City"', '"도시"'],
  ['"Browser"', '"브라우저"'],
  ['"User agent"', '"User Agent"'],

  // Tables / labels (must come after combinations above so we do not break "Short URLs")
  ['"Short URLs"', '"단축 링크"'],
  ['"Visits"', '"방문"'],
  ['"Tags"', '"태그"'],
  ['"Title"', '"제목"'],
  ['"Date created"', '"생성일"'],
  ['"Date"', '"날짜"'],
  ['"Long URL"', '"원본 URL"'],
  ['"Short URL"', '"단축 링크"'],
  ['"Domain"', '"도메인"'],
  ['"Domains"', '"도메인"'],
  ['"Tag"', '"태그"'],
  ['"List"', '"목록"'],
  ['"Filter"', '"필터"'],
  ['"Search..."', '"검색..."'],
  ['"Search"', '"검색"'],
  ['"More"', '"더 보기"'],
  ['"Settings"', '"설정"'],
  ['"Options"', '"옵션"'],
  ['"Yes"', '"예"'],
  ['"No"', '"아니오"'],
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
