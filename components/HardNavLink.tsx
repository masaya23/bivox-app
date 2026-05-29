'use client';

import type { ReactNode, MouseEvent } from 'react';
import { Capacitor } from '@capacitor/core';

type HardNavLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void | Promise<void>;
};

function isNativePlatform(): boolean {
  try {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function toCapacitorPath(path: string): string {
  if (path === '/' || path === '') return '/';
  if (path.includes('.')) return path;

  const qIndex = path.indexOf('?');
  if (qIndex !== -1) {
    return path.substring(0, qIndex) + '.html' + path.substring(qIndex);
  }

  const hIndex = path.indexOf('#');
  if (hIndex !== -1) {
    return path.substring(0, hIndex) + '.html' + path.substring(hIndex);
  }

  return path + '.html';
}

/**
 * Next.jsのクライアント遷移（RSC fetch）が失敗する環境でも、
 * 常に通常のページ遷移（window.location）で確実に遷移するリンク。
 */
export default function HardNavLink({ href, className, children, onClick }: HardNavLinkProps) {
  const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    // 新規タブ等の通常挙動は維持
    if (e.button !== 0) return;
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;

    const onClickResult = onClick?.(e);
    if (e.defaultPrevented) return;

    e.preventDefault();
    await onClickResult;

    const targetHref = isNativePlatform() ? toCapacitorPath(href) : href;
    window.location.assign(targetHref);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
