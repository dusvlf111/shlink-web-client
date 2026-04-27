/**
 * PocketBase JS SDK throws ClientResponseError objects whose user-friendly
 * payload lives in error.data. Surface as much detail as possible so admins
 * can tell whether the failure came from a missing field, a misconfigured
 * rule, or a real 5xx.
 */
export const describePocketBaseError = (error: unknown): string => {
  if (!error) {
    return '';
  }

  if (typeof error === 'object' && error !== null) {
    const maybe = error as {
      status?: number;
      message?: string;
      data?: { message?: string; data?: Record<string, { message?: string }> };
      originalError?: { message?: string };
    };

    const fragments: string[] = [];

    if (typeof maybe.status === 'number') {
      fragments.push(`HTTP ${maybe.status}`);
    }

    const apiMessage = maybe.data?.message ?? maybe.message;
    if (apiMessage && apiMessage !== 'The request failed.') {
      fragments.push(apiMessage);
    }

    const fieldErrors = maybe.data?.data;
    if (fieldErrors && typeof fieldErrors === 'object') {
      Object.entries(fieldErrors).forEach(([field, info]) => {
        if (info?.message) {
          fragments.push(`${field}: ${info.message}`);
        }
      });
    }

    if (fragments.length === 0 && maybe.originalError?.message) {
      fragments.push(maybe.originalError.message);
    }

    return fragments.length > 0 ? ` (${fragments.join(' · ')})` : '';
  }

  if (typeof error === 'string' && error) {
    return ` (${error})`;
  }

  return '';
};
