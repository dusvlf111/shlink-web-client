import type { UtmTemplate } from './useUtmData';

// Case-insensitive substring match used by the template/tag search boxes.
// An empty query matches everything.
export const matchesSearch = (
  query: string,
  ...values: Array<string | undefined>
): boolean => {
  const q = query.trim().toLowerCase();
  return !q || values.some((value) => value?.toLowerCase().includes(q));
};

export const matchesTemplateSearch = (
  query: string,
  template: UtmTemplate,
): boolean =>
  matchesSearch(
    query,
    template.name,
    template.description,
    template.source,
    template.medium,
    template.campaign,
    template.term,
    template.content,
  );
