'use client';

import type { ReactNode, MouseEvent } from 'react';
import { Capacitor } from '@capacitor/core';

type HardNavLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

const isNative = (() => {
  try {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

/**
 * Next.jsのクライアント遷移（RSC fetch）が失敗する環境でも、
 * 常に通常のページ遷移（window.location）で確実に遷移するリンク。
 */
export default function HardNavLink({ href, className, children, onClick }: HardNavLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // カスタムonClickがあれば先に実行
    onClick?.(e);

    // 新規タブ等の通常挙動は維持
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;

    e.preventDefault();
    // Capacitor環境では.html拡張子を付与して正しいファイルにルーティング
    const targetHref = isNative && href !== '/' && !href.includes('.')
      ? href + '.html'
      : href;
    window.location.assign(targetHref);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
