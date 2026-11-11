import type { UtmTemplate } from '../../src/utm/useUtmData';
import { matchesSearch, matchesTemplateSearch } from '../../src/utm/utmSearch';

describe('matchesSearch', () => {
  it('matches everything when the query is blank', () => {
    expect(matchesSearch('', 'a')).toBe(true);
    expect(matchesSearch('   ', undefined)).toBe(true);
  });

  it('matches a case-insensitive substring of any value', () => {
    expect(matchesSearch('INSTA', undefined, '[오공고 인스타그램] instagram')).toBe(true);
    expect(matchesSearch('인스타', '[오공고 인스타그램] 리틀리')).toBe(true);
    expect(matchesSearch('메타', '[네이버블로그]', undefined)).toBe(false);
  });
});

describe('matchesTemplateSearch', () => {
  const template: UtmTemplate = {
    id: 't1',
    name: '[메타] 광고',
    description: '페이스북 피드',
    source: 'meta',
    medium: 'paid_social',
    campaign: 'letscon',
  };

  it.each(['메타', '피드', 'META', 'paid', 'letscon'])('matches by "%s"', (query) => {
    expect(matchesTemplateSearch(query, template)).toBe(true);
  });

  it('rejects a query no field contains', () => {
    expect(matchesTemplateSearch('네이버', template)).toBe(false);
  });
});
