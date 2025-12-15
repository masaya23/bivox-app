'use client';

import type { ReactNode, MouseEvent } from 'react';

type HardNavLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

/**
 * Next.jsのクライアント遷移（RSC fetch）が失敗する環境でも、
 * 常に通常のページ遷移（window.location）で確実に遷移するリンク。
 */
export default function HardNavLink({ href, className, children }: HardNavLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // 新規タブ等の通常挙動は維持
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;

    e.preventDefault();
    window.location.assign(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
