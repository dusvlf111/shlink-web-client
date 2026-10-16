import {
  enqueueHistoryEntry,
  flushHistoryOutbox,
  pendingHistoryCount,
} from '../../src/history/historyOutbox';
import * as historyService from '../../src/history/shortUrlHistoryService';
import { pb } from '../../src/lib/pocketbase';

vi.mock('../../src/history/shortUrlHistoryService', async (importOriginal) => {
  const actual = await importOriginal<typeof historyService>();
  return {
    ...actual,
    createHistoryRecord: vi.fn(),
    buildDeletionHistoryInput: vi.fn(),
  };
});

const createHistoryRecord = vi.mocked(historyService.createHistoryRecord);
const buildDeletionHistoryInput = vi.mocked(
  historyService.buildDeletionHistoryInput,
);

const input = (shortCode: string) => ({
  server_id: 'srv-1',
  short_url: `https://s.test/${shortCode}`,
  short_code: shortCode,
  long_url: 'https://example.com',
});

describe('historyOutbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    pb.authStore.save('token', { id: 'user-1' } as never);
  });

  afterEach(() => {
    pb.authStore.clear();
  });

  it('queues entries synchronously without touching PocketBase', () => {
    enqueueHistoryEntry({ kind: 'record', input: input('a') });

    expect(pendingHistoryCount()).toBe(1);
    expect(createHistoryRecord).not.toHaveBeenCalled();
  });

  it('sends queued entries oldest first and empties the queue', async () => {
    createHistoryRecord.mockResolvedValue(true);
    enqueueHistoryEntry({ kind: 'record', input: input('a') });
    enqueueHistoryEntry({ kind: 'record', input: input('b') });

    const sent = await flushHistoryOutbox();

    expect(sent).toBe(2);
    expect(pendingHistoryCount()).toBe(0);
    expect(
      createHistoryRecord.mock.calls.map(([arg]) => arg.short_code),
    ).toEqual(['a', 'b']);
  });

  it('keeps entries and stops at the first failure so they retry later', async () => {
    createHistoryRecord
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('pb down'));
    enqueueHistoryEntry({ kind: 'record', input: input('a') });
    enqueueHistoryEntry({ kind: 'record', input: input('b') });
    enqueueHistoryEntry({ kind: 'record', input: input('c') });

    const sent = await flushHistoryOutbox();

    expect(sent).toBe(1);
    expect(pendingHistoryCount()).toBe(2);
    expect(createHistoryRecord).toHaveBeenCalledTimes(2);
  });

  it('keeps everything while nobody is logged in', async () => {
    pb.authStore.clear();
    enqueueHistoryEntry({ kind: 'record', input: input('a') });

    const sent = await flushHistoryOutbox();

    expect(sent).toBe(0);
    expect(pendingHistoryCount()).toBe(1);
    expect(createHistoryRecord).not.toHaveBeenCalled();
  });

  it('resolves deletion entries into a history input at flush time', async () => {
    const deletionInput = { ...input('gone'), action: 'deleted' as const };
    buildDeletionHistoryInput.mockResolvedValue(deletionInput);
    createHistoryRecord.mockResolvedValue(true);
    enqueueHistoryEntry({
      kind: 'deletion',
      params: {
        server_id: 'srv-1',
        short_code: 'gone',
        short_url: 'https://s.test/gone',
      },
    });

    await flushHistoryOutbox();

    expect(buildDeletionHistoryInput).toHaveBeenCalledOnce();
    expect(createHistoryRecord).toHaveBeenCalledWith(deletionInput);
    expect(pendingHistoryCount()).toBe(0);
  });

  it('shares one run between concurrent flushes so nothing is sent twice', async () => {
    createHistoryRecord.mockResolvedValue(true);
    enqueueHistoryEntry({ kind: 'record', input: input('a') });

    await Promise.all([flushHistoryOutbox(), flushHistoryOutbox()]);

    expect(createHistoryRecord).toHaveBeenCalledTimes(1);
  });
});
