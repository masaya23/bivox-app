'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import HardNavLink from '@/components/HardNavLink';
import { useAuth } from '@/contexts/AuthContext';

export default function WelcomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

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
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* マスコット */}
        <div className="mb-6">
          <Image
            src="/images/mascot/fox_top.png"
            alt="Bivox マスコット"
            width={260}
            height={260}
            className="drop-shadow-lg"
            priority
          />
        </div>

        {/* ロゴ */}
        <div className="mb-16">
          <Image
            src="/images/bivox-logo-welcome.png"
            alt="Bivox"
            width={200}
            height={80}
            className="drop-shadow-md"
            priority
          />
        </div>

        {/* アクションボタン */}
        <div className="w-full space-y-3">
          {/* メインアクションボタン: 濃い茶色テキスト + 強めのシャドウ */}
          <HardNavLink
            href="/auth/register"
            className="block w-full py-4 bg-white text-[#5D4037] text-center font-black text-lg rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_25px_rgba(0,0,0,0.2)] transition-all active:scale-[0.98]"
          >
            無料で始める
          </HardNavLink>
          {/* サブアクションボタン: 濃い茶色の枠線とテキスト */}
          <HardNavLink
            href="/auth/login"
            className="block w-full py-4 bg-white/20 backdrop-blur-sm text-[#5D4037] text-center font-bold text-lg rounded-2xl border-2 border-[#5D4037]/60 hover:bg-white/30 hover:border-[#5D4037]/80 transition-all active:scale-[0.98]"
          >
            ログイン
          </HardNavLink>
        </div>
      </div>

      {/* フッター - セーフエリアを考慮した余白 */}
      <div className="pb-12 pt-4 px-6 relative z-10" style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 3rem))' }}>
        <div className="flex items-center justify-center gap-4 text-[#5D4037]/70 text-xs">
          <a href="/terms" className="hover:text-[#5D4037] transition-colors py-2 px-1">
            利用規約
          </a>
          <span className="text-[#5D4037]/50">|</span>
          <a href="/privacy" className="hover:text-[#5D4037] transition-colors py-2 px-1">
            プライバシーポリシー
          </a>
        </div>
      </div>
    </div>
  );
}
