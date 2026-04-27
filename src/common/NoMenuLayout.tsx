import { clsx } from 'clsx';
import type { FC, PropsWithChildren } from 'react';

export type NoMenuLayoutProps = PropsWithChildren & {
  className?: string;
};

export const NoMenuLayout: FC<NoMenuLayoutProps> = ({ children, className }) => (
  <div className="w-full md:pl-(--aside-menu-width)">
    {/* Match the spacing used by @shlinkio/shlink-web-component's main wrapper:
        container mx-auto + horizontal px-3 + top padding 20/30px so our
        in-house pages line up with the external short-url pages. */}
    <div className={clsx('container mx-auto px-3 pt-[20px] md:pt-[30px] pb-[20px]', className)}>
      {children}
    </div>
  </div>
);
