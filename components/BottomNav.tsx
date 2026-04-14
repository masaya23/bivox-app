'use client';

import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestUser } from '@/utils/guestAccess';

const isNative = (() => {
  try {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

// ========== ボトムナビ デザイン定数 ==========
const NAV_COLORS = {
  background: '#FFFFFF',
  active: '#5D4037',    // ブランド茶色（視認性◎）
  inactive: '#9CA3AF',  // 落ち着いたグレー
} as const;

// ── SVG アイコン群 ──

function IconHome({ active }: { active: boolean }) {
  const color = active ? NAV_COLORS.active : NAV_COLORS.inactive;
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconChart({ active }: { active: boolean }) {
  const color = active ? NAV_COLORS.active : NAV_COLORS.inactive;
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={active ? 2 : 1.8} />
      <path d="M7 17V13" />
      <path d="M12 17V8" />
      <path d="M17 17V11" />
    </svg>
  );
}

function IconSettings({ active }: { active: boolean }) {
  const color = active ? NAV_COLORS.active : NAV_COLORS.inactive;
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function IconHelp({ active }: { active: boolean }) {
  const color = active ? NAV_COLORS.active : NAV_COLORS.inactive;
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ナビ項目の型
interface NavItem {
  href: string;
  icon: (active: boolean) => React.ReactNode;
  label: string;
}

// ナビ項目データ
const NAV_ITEMS: NavItem[] = [
  { href: '/home', icon: (a) => <IconHome active={a} />, label: 'ホーム' },
  { href: '/study-log', icon: (a) => <IconChart active={a} />, label: '学習ログ' },
  { href: '/settings', icon: (a) => <IconSettings active={a} />, label: '設定' },
  { href: '/help', icon: (a) => <IconHelp active={a} />, label: 'ヘルプ' },
];

// 個別ナビアイテムコンポーネント
function NavItemButton({
  item,
  isActive,
  isGuest,
}: {
  item: NavItem;
  isActive: boolean;
  isGuest: boolean;
}) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const resolvedHref = isGuest && item.href === '/study-log'
      ? '/auth/register'
      : item.href;
    const targetHref = isNative && resolvedHref !== '/' && !resolvedHref.includes('.')
      ? resolvedHref + '.html'
      : resolvedHref;
    window.location.assign(targetHref);
  };

  const color = isActive ? NAV_COLORS.active : NAV_COLORS.inactive;

  return (
    <a
      href={item.href}
      onClick={handleClick}
      className="flex flex-col items-center justify-center min-h-[52px] min-w-[44px] pt-2 pb-1 active:opacity-70 transition-opacity duration-100"
    >
      {/* アイコン */}
      <span className="mb-1">
        {item.icon(isActive)}
      </span>

      {/* ラベル */}
      <span
        className="leading-tight whitespace-nowrap"
        style={{
          color,
          fontSize: isActive ? '12px' : '11px',
          fontWeight: isActive ? 700 : 500,
        }}
      >
        {item.label}
      </span>
    </a>
  );
}

// メインコンポーネント
export default function BottomNav({
  currentPath = '/home',
}: {
  currentPath?: string;
}) {
  const { user } = useAuth();
  const isGuest = isGuestUser(user);

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40"
      style={{
        backgroundColor: NAV_COLORS.background,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => (
          <NavItemButton
            key={item.href}
            item={item}
            isActive={currentPath === item.href}
            isGuest={isGuest}
          />
        ))}
      </div>
    </nav>
  );
}
