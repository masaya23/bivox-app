'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import HardNavLink from '@/components/HardNavLink';
import { useHideNativeBanner } from '@/hooks/useHideNativeBanner';

const ANDROID_INTENT_APP_OPEN_URL =
  'intent:#Intent;package=com.shunkan.eikaiwa;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end';

function isAndroidBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

export default function VerifiedPage() {
  useHideNativeBanner();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (Capacitor.isNativePlatform()) {
      return;
    }

    if (!isAndroidBrowser()) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.location.href = ANDROID_INTENT_APP_OPEN_URL;
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto relative shadow-xl">
      <header className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-center">
          <h1 className="text-lg font-bold text-[#5D4037]">認証完了</h1>
        </div>
      </header>

      <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-6 shadow-lg">
          <svg
            className="w-12 h-12 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-[#5D4037] mb-3">
          メール認証が完了しました
        </h2>

        <p className="text-gray-600 text-sm text-center leading-relaxed mb-6">
          Bivoxアプリを開いてログインしてください。<br />
          Android では下のボタンからアプリに戻れます。
        </p>

        <a
          href={ANDROID_INTENT_APP_OPEN_URL}
          className="w-full py-4 bg-gradient-to-r from-[#FFE566] to-[#FCC800] text-[#5D4037] font-black text-lg rounded-2xl shadow-[0_4px_15px_rgba(252,200,0,0.4)] text-center"
        >
          Bivoxアプリを開く
        </a>

        <p className="mt-3 text-xs text-gray-500 text-center leading-relaxed">
          開かない場合は、Bivoxアプリを手動で開いてログインしてください。
        </p>

        <div className="mt-6 w-full bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <p className="text-[#5D4037] font-bold text-sm mb-2 text-center">PCで認証した場合</p>
          <p className="text-gray-600 text-sm text-center leading-relaxed">
            スマホで Bivox アプリを開いて、登録したメールアドレスでログインしてください。
          </p>
        </div>

        <HardNavLink
          href="/auth/login?verified=true"
          className="mt-6 text-[#5D4037] font-bold underline underline-offset-2"
        >
          ブラウザでログイン画面を開く
        </HardNavLink>
      </div>
    </div>
  );
}
