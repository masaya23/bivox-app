'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import HardNavLink from '@/components/HardNavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useHideNativeBanner } from '@/hooks/useHideNativeBanner';

export default function WelcomePage() {
  const router = useAppRouter();
  const { isAuthenticated, isLoading, signInAsGuest } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);

  useHideNativeBanner();

  const handleGuestStart = async () => {
    setGuestLoading(true);
    const result = await signInAsGuest();
    if (result.success) {
      router.push('/home');
    } else {
      setGuestLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/home');
    }
  }, [isLoading, isAuthenticated, router]);

  // 認証チェック中、またはログイン済みでリダイレクト待ち
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFE566] via-[#FCC800] to-[#FFD900] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE566] via-[#FCC800] to-[#FFD900] flex flex-col max-w-[430px] mx-auto relative shadow-xl">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute top-60 -right-20 w-60 h-60 bg-yellow-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-10 w-32 h-32 bg-white/25 rounded-full blur-2xl" />
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col items-center px-6 relative z-10">
        {/* 上部スペーサー */}
        <div className="flex-[1.5]" />

        {/* ウェルカム画像（キツネ+ロゴ一体） */}
        <div className="w-[calc(100%+96px)] -mx-12">
          <Image
            src="/images/bivox-welcome.png"
            alt="Bivox 瞬間英会話"
            width={4961}
            height={3508}
            className="w-full h-auto"
            priority
          />
        </div>

        {/* 中央スペーサー */}
        <div className="flex-[0.5]" />

        {/* 下部グループ: ボタン + フッター */}
        <div className="w-full pb-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
          <div className="space-y-4 mb-6">
            <HardNavLink
              href="/auth/register"
              className="block w-full py-4 bg-white text-[#5D4037] text-center font-black text-lg rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all active:scale-[0.98]"
            >
              無料で始める
            </HardNavLink>
            <HardNavLink
              href="/auth/login"
              className="block w-full py-4 bg-transparent text-white text-center font-bold text-lg rounded-2xl border-[1.5px] border-white/80 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              ログイン
            </HardNavLink>
            <button
              onClick={handleGuestStart}
              disabled={guestLoading}
              className="block w-full py-4 bg-[#5D4037]/10 text-[#5D4037] text-center font-bold text-lg rounded-2xl border border-[#5D4037]/20 shadow-[0_4px_16px_rgba(93,64,55,0.08)] transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {guestLoading ? '読み込み中...' : 'ゲストでスタート'}
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 text-white/60 text-xs">
            <a href="/terms" className="hover:text-white/90 transition-colors py-2 px-1">
              利用規約
            </a>
            <span className="text-white/40">|</span>
            <a href="/privacy" className="hover:text-white/90 transition-colors py-2 px-1">
              プライバシーポリシー
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
