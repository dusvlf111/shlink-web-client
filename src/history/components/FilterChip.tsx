import type { FC, ReactNode } from 'react';

// A pill-shaped toggle button used for the chip filters (action, server, tag,
// template). Sized for easy tapping. Highlighted blue when active.
export const FilterChip: FC<{
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={
      active
        ? 'rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white'
        : 'rounded-full border border-lm-border bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:border-dm-border dark:bg-dm-main dark:text-gray-300 dark:hover:bg-gray-800'
    }
  >
    {children}
  </button>
);
