import type { ShlinkVisit } from '@shlinkio/shlink-js-sdk/api-contract';
import bowser from 'bowser';

export type Bucket = {
  key: string;
  count: number;
};

const sortByCountDesc = (bucket: Bucket[]) => bucket.sort((a, b) => b.count - a.count);

const tally = (entries: Array<string | undefined>, fallback: string): Bucket[] => {
  const counts = new Map<string, number>();
  entries.forEach((entry) => {
    const key = (entry?.trim() || fallback);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return sortByCountDesc(Array.from(counts, ([key, count]) => ({ key, count })));
};

const refererHost = (referer: string | undefined): string | undefined => {
  if (!referer) {
    return undefined;
  }
  try {
    return new URL(referer).hostname || undefined;
  } catch {
    return referer;
  }
};

const parseUserAgent = (userAgent: string | undefined): { browser?: string; os?: string } => {
  if (!userAgent) {
    return {};
  }
  try {
    const parsed = bowser.parse(userAgent);
    return {
      browser: parsed.browser.name,
      os: parsed.os.name,
    };
  } catch {
    return {};
  }
};

export const visitsByDay = (visits: ShlinkVisit[]): Bucket[] => {
  const counts = new Map<string, number>();
  visits.forEach((visit) => {
    const day = visit.date?.slice(0, 10);
    if (!day) return;
    counts.set(day, (counts.get(day) ?? 0) + 1);
  });
  return Array.from(counts, ([key, count]) => ({ key, count })).sort((a, b) => a.key.localeCompare(b.key));
};

export const visitsByReferer = (visits: ShlinkVisit[], directLabel: string, unknownLabel: string): Bucket[] => {
  const entries = visits.map((visit) => {
    if (!visit.referer) {
      return directLabel;
    }
    return refererHost(visit.referer) ?? unknownLabel;
  });
  return tally(entries, unknownLabel);
};

export const visitsByOs = (visits: ShlinkVisit[], unknownLabel: string): Bucket[] => {
  const entries = visits.map((visit) => parseUserAgent(visit.userAgent).os);
  return tally(entries, unknownLabel);
};

export const visitsByBrowser = (visits: ShlinkVisit[], unknownLabel: string): Bucket[] => {
  const entries = visits.map((visit) => parseUserAgent(visit.userAgent).browser);
  return tally(entries, unknownLabel);
};

export const visitsByCountry = (visits: ShlinkVisit[], unknownLabel: string): Bucket[] => {
  const entries = visits.map((visit) => visit.visitLocation?.countryName ?? undefined);
  return tally(entries, unknownLabel);
};

export const visitsByCity = (visits: ShlinkVisit[], unknownLabel: string): Bucket[] => {
  const entries = visits.map((visit) => visit.visitLocation?.cityName ?? undefined);
  return tally(entries, unknownLabel);
};

export const buildVisitsTimeline = (visits: ShlinkVisit[]): { labels: string[]; values: number[] } => {
  const buckets = visitsByDay(visits);
  return {
    labels: buckets.map((bucket) => bucket.key),
    values: buckets.map((bucket) => bucket.count),
  };
};
