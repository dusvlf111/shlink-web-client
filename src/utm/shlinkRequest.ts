// Shlink can be slow (title resolution, cold start, rate limiting), so give a
// request a generous budget before declaring it failed.
export const SHLINK_REQUEST_TIMEOUT_MS = 20_000;

export class ShlinkRequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      `Shlink 서버 응답이 ${timeoutMs / 1000}초 안에 오지 않았습니다 ` +
        '(서버가 느리거나 rate limit 일 수 있습니다. ' +
        '요청이 서버에서는 이미 처리되었을 수 있으니 히스토리/목록에서 확인해 주세요)',
    );
    this.name = 'ShlinkRequestTimeoutError';
  }
}

type WithRequestTimeoutOptions = {
  timeoutMs?: number;
  // Extra attempts made ONLY when the request timed out. Callers should only
  // use this for idempotent requests (e.g. createShortUrl with findIfExists).
  retries?: number;
};

// Runs a request with a real timeout: when the budget is exhausted the
// request is aborted (not just ignored, which would let it keep running and
// mutate server state after the caller has moved on), and the timer is always
// cleaned up.
export const withRequestTimeout = async <Result>(
  makeRequest: (signal: AbortSignal) => Promise<Result>,
  {
    timeoutMs = SHLINK_REQUEST_TIMEOUT_MS,
    retries = 0,
  }: WithRequestTimeoutOptions = {},
): Promise<Result> => {
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await makeRequest(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        throw error;
      }
      if (attempt >= retries) {
        throw new ShlinkRequestTimeoutError(timeoutMs);
      }
      // Timed out and retries remain: loop and try again.
    } finally {
      clearTimeout(timer);
    }
  }
};
