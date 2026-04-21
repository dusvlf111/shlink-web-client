import { faServer, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { clsx } from 'clsx';
import { type FC, useEffect, useRef, useState } from 'react';
import { pb } from '../lib/pocketbase';
import { useServerConfigs } from '../servers/useServerConfigs';

export const ServerInfoFloating: FC = () => {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(pb.authStore.isValid);
  const panelRef = useRef<HTMLDivElement>(null);
  const { configs, loading } = useServerConfigs();

  useEffect(() => {
    const unsub = pb.authStore.onChange(() => {
      setIsLoggedIn(pb.authStore.isValid);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div ref={panelRef} className="fixed right-4 bottom-20 z-50">
      {open && (
        <div
          className={clsx(
            'absolute bottom-full mb-2 right-0 w-72',
            'rounded-lg border border-lm-border bg-white shadow-xl dark:border-dm-border dark:bg-dm-primary',
          )}
        >
          <div className="flex items-center justify-between border-b border-lm-border px-4 py-3 dark:border-dm-border">
            <span className="text-sm font-semibold">서버 정보</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="닫기"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-3">
            {loading && (
              <p className="py-2 text-center text-xs text-gray-400">불러오는 중...</p>
            )}
            {!loading && configs.length === 0 && (
              <p className="py-2 text-center text-xs text-gray-400">등록된 서버 정보가 없습니다.</p>
            )}
            {!loading && configs.map((cfg) => (
              <div
                key={cfg.id}
                className="mb-2 last:mb-0 rounded-md border border-lm-border p-3 dark:border-dm-border"
              >
                <p className="mb-1 text-sm font-semibold">{cfg.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                  <span className="font-medium">도메인:</span> {cfg.url}
                </p>
                {cfg.api_key && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 break-all">
                    <span className="font-medium">API 키:</span> {cfg.api_key}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="서버 정보 보기"
        title="서버 정보"
        className={clsx(
          'flex items-center gap-2 rounded-full px-4 py-2',
          'bg-white border border-lm-border text-gray-700 shadow-md text-sm font-medium',
          'hover:bg-gray-50 dark:bg-dm-primary dark:border-dm-border dark:text-gray-200 dark:hover:bg-dm-secondary',
          'transition-colors',
        )}
      >
        <FontAwesomeIcon icon={faServer} />
        <span>서버 정보</span>
      </button>
    </div>
  );
};
