import { pb } from '../lib/pocketbase';
import type {
  DeletionHistoryParams,
  ShortUrlHistoryInput,
} from './shortUrlHistoryService';
import {
  buildDeletionHistoryInput,
  createHistoryRecord,
} from './shortUrlHistoryService';

// Short-url creation/deletion must never wait on PocketBase. Instead of writing
// history records inline, the API client wrapper drops them into this local
// outbox (a synchronous localStorage write) and a background flush ships them
// to PocketBase later: periodically while the app is open, when the tab is
// hidden/regains focus, and whenever the history page is opened.
//
// Entries survive reloads and PocketBase outages; they are removed only after
// PocketBase confirmed the write.

const STORAGE_KEY = 'shlink-history-outbox';
// Safety cap so a long PocketBase outage can't grow localStorage unbounded.
// The oldest entries are dropped first.
const MAX_ENTRIES = 1000;
const LOCK_NAME = 'shlink-history-outbox-flush';

type OutboxPayload =
  | { kind: 'record'; input: ShortUrlHistoryInput }
  | { kind: 'deletion'; params: DeletionHistoryParams };

type OutboxEntry = OutboxPayload & {
  id: string;
  queuedAt: string;
};

const readEntries = (): OutboxEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : [];
  } catch {
    return [];
  }
};

const writeEntries = (entries: OutboxEntry[]): void => {
  try {
    if (entries.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(-MAX_ENTRIES)),
    );
  } catch {
    // localStorage unavailable/full: history is best-effort, drop silently.
  }
};

const newId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Queues a history entry. Synchronous, never throws.
export const enqueueHistoryEntry = (payload: OutboxPayload): void => {
  writeEntries([
    ...readEntries(),
    { ...payload, id: newId(), queuedAt: new Date().toISOString() },
  ]);
};

export const pendingHistoryCount = (): number => readEntries().length;

const removeEntry = (id: string): void => {
  // Re-read so entries queued while we were flushing are not lost.
  writeEntries(readEntries().filter((entry) => entry.id !== id));
};

const sendEntry = async (entry: OutboxEntry): Promise<boolean> => {
  const input =
    entry.kind === 'deletion'
      ? await buildDeletionHistoryInput(entry.params)
      : entry.input;
  return createHistoryRecord(input);
};

let flushing: Promise<number> | undefined;

const runFlush = async (): Promise<number> => {
  if (!pb.authStore.record?.id) {
    // Not logged in: keep entries until a user can be attributed.
    return 0;
  }

  let sent = 0;
  for (const entry of readEntries()) {
    try {
      const stored = await sendEntry(entry);
      if (!stored) {
        break;
      }
      removeEntry(entry.id);
      sent += 1;
    } catch {
      // PocketBase unreachable/erroring: stop and retry on the next flush.
      break;
    }
  }
  return sent;
};

// Ships queued entries to PocketBase, oldest first, stopping at the first
// failure. Resolves with the number of entries sent. Concurrent calls (and
// other tabs, via the Web Locks API when available) share a single run so an
// entry is never written twice.
export const flushHistoryOutbox = (): Promise<number> => {
  if (readEntries().length === 0) {
    return Promise.resolve(0);
  }
  if (flushing) {
    return flushing;
  }

  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  const run = locks
    ? locks.request(LOCK_NAME, { ifAvailable: true }, (lock) =>
      lock ? runFlush() : 0,
    )
    : runFlush();

  flushing = Promise.resolve(run)
    .catch(() => 0)
    .finally(() => {
      flushing = undefined;
    });
  return flushing;
};

const FLUSH_INTERVAL_MS = 30_000;

// Starts the periodic/visibility-driven background flush. Returns a cleanup
// function. Safe to call multiple times (each call returns its own cleanup).
export const startHistoryOutboxSync = (): (() => void) => {
  const flush = () => void flushHistoryOutbox();

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  };

  const timer = setInterval(flush, FLUSH_INTERVAL_MS);
  window.addEventListener('online', flush);
  document.addEventListener('visibilitychange', onVisibility);
  // Pick up entries left over from a previous session shortly after startup.
  const startupTimer = setTimeout(flush, 3_000);

  return () => {
    clearInterval(timer);
    clearTimeout(startupTimer);
    window.removeEventListener('online', flush);
    document.removeEventListener('visibilitychange', onVisibility);
  };
};
