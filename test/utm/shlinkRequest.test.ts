import {
  ShlinkRequestTimeoutError,
  withRequestTimeout,
} from '../../src/utm/shlinkRequest';

// A request that never settles on its own but rejects when aborted, like fetch.
const hangingRequest = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });

describe('withRequestTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the result when the request finishes in time', async () => {
    await expect(
      withRequestTimeout(() => Promise.resolve('ok'), { timeoutMs: 1000 }),
    ).resolves.toBe('ok');
  });

  it('aborts the request and throws a timeout error when it takes too long', async () => {
    let capturedSignal: AbortSignal | undefined;
    const promise = withRequestTimeout(
      (signal) => {
        capturedSignal = signal;
        return hangingRequest(signal);
      },
      { timeoutMs: 1000 },
    );
    const assertion = expect(promise).rejects.toBeInstanceOf(
      ShlinkRequestTimeoutError,
    );

    await vi.advanceTimersByTimeAsync(1000);

    await assertion;
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('retries once on timeout and returns the retry result', async () => {
    const makeRequest = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockImplementationOnce(hangingRequest)
      .mockResolvedValueOnce('second');

    const promise = withRequestTimeout(makeRequest, {
      timeoutMs: 1000,
      retries: 1,
    });
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBe('second');
    expect(makeRequest).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-timeout errors', async () => {
    const makeRequest = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockRejectedValue(new Error('HTTP 400'));

    await expect(
      withRequestTimeout(makeRequest, { timeoutMs: 1000, retries: 3 }),
    ).rejects.toThrow('HTTP 400');
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });
});
