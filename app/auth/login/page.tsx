'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import Image from 'next/image';
import HardNavLink from '@/components/HardNavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useHideNativeBanner } from '@/hooks/useHideNativeBanner';

const ANDROID_INTENT_LOGIN_DEEP_LINK =
  'intent:#Intent;package=com.shunkan.eikaiwa;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end';

function isAndroidBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

function getPreferredAppOpenUrl(): string {
  return ANDROID_INTENT_LOGIN_DEEP_LINK;
}

function LoginPageInner() {
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const { signIn, resendVerification, useFirebase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [showOpenAppButton, setShowOpenAppButton] = useState(false);
  const [isExternalBrowserVerified, setIsExternalBrowserVerified] = useState(false);

  useHideNativeBanner();

  // メール認証完了後のリダイレクトを検出
  useEffect(() => {
    let fallbackTimer: number | undefined;

    if (searchParams.get('verified') === 'true') {
      setVerifiedSuccess(true);
      const isNativePlatform = Capacitor.isNativePlatform();
      const shouldPromptOpenApp = !isNativePlatform;

      setIsExternalBrowserVerified(shouldPromptOpenApp);
      setShowOpenAppButton(shouldPromptOpenApp);

      if (shouldPromptOpenApp && isAndroidBrowser() && typeof window !== 'undefined') {
        fallbackTimer = window.setTimeout(() => {
          window.location.href = getPreferredAppOpenUrl();
        }, 500);
      }

      if (typeof window !== 'undefined') {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('verified');
        const cleanPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
        window.history.replaceState({}, '', cleanPath);
      }
    }

    return () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
    };
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // メール・パスワードのバリデーション
      if (!email || !password) {
        setError('メールアドレスとパスワードを入力してください');
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('パスワードは6文字以上で入力してください');
        setIsLoading(false);
        return;
      }

      // AuthContextのsignInを使用
      const result = await signIn(email, password);

      if (result.success) {
        if (result.needsVerification) {
          // メール認証が必要な場合
          setVerificationEmail(email);
          setNeedsVerification(true);
        } else {
          // ログイン成功 - ホームへリダイレクト
          router.push('/home');
        }
      } else {
        setError(result.error?.message || 'ログインに失敗しました');
      }
    } catch {
      setError('ログインに失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendStatus('sending');
    try {
      const result = await resendVerification();
      if (result.success) {
        setResendStatus('sent');
      } else {
        setResendStatus('error');
        setError(result.error || '再送信に失敗しました');
      }
    } catch {
      setResendStatus('error');
      setError('再送信に失敗しました');
    }
  };

  // メール認証待ち画面
  if (needsVerification) {
    return (
      <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto relative shadow-xl">
        {/* ヘッダー */}
        <header className="bg-white px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setNeedsVerification(false);
                setResendStatus('idle');
                setError('');
              }}
              className="text-[#5D4037] hover:text-[#4E342E] text-2xl font-light w-10 h-10 flex items-center justify-center -ml-2"
            >
              ‹
            </button>
            <h1 className="text-lg font-bold text-[#5D4037]">メール認証が必要です</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* メインコンテンツ */}
        <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center">
          {/* 警告アイコン */}
          <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg
              className="w-12 h-12 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-[#5D4037] mb-3">
            メールアドレスを確認してください
          </h2>

          <p className="text-gray-600 text-center mb-2">
            <span className="font-medium text-[#5D4037]">{verificationEmail}</span>
          </p>

          <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
            ログインするには、まずメールアドレスを<br />
            認証する必要があります。<br />
            登録時に送信された確認メールをご確認ください。
          </p>

          {/* 注意事項 */}
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <p className="text-amber-800 text-sm text-center">
              📧 メールが届かない場合は、迷惑メールフォルダをご確認ください
            </p>
          </div>

          {error && (
            <div className="w-full p-3 bg-red-50 border border-red-200 rounded-2xl mb-4">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {/* 確認メール再送信ボタン */}
          <button
            onClick={handleResendVerification}
            disabled={resendStatus === 'sending' || resendStatus === 'sent'}
            className="w-full py-4 bg-gradient-to-r from-[#FFE566] to-[#FCC800] text-[#5D4037] font-black text-lg rounded-2xl shadow-[0_4px_15px_rgba(252,200,0,0.4)] hover:shadow-[0_6px_20px_rgba(252,200,0,0.5)] transition-all disabled:opacity-50 mb-4"
          >
            {resendStatus === 'sending'
              ? '送信中...'
              : resendStatus === 'sent'
              ? '✓ 送信しました'
              : '確認メールを再送信'}
          </button>

          {resendStatus === 'sent' && (
            <p className="text-green-600 text-sm text-center mb-4">
              確認メールを再送信しました。メールをご確認ください。
            </p>
          )}

          {/* ログインに戻るリンク */}
          <button
            onClick={() => {
              setNeedsVerification(false);
              setResendStatus('idle');
              setError('');
            }}
            className="text-[#5D4037] font-bold hover:text-[#4E342E] underline underline-offset-2"
          >
            ログインに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto relative shadow-xl">
      {/* ヘッダー - シンプルな白背景 */}
      <header className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <HardNavLink
            href="/"
            className="text-[#5D4037] hover:text-[#4E342E] text-2xl font-light w-10 h-10 flex items-center justify-center -ml-2"
          >
            ‹
          </HardNavLink>
          <h1 className="text-lg font-bold text-[#5D4037]">ログイン</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 px-6 py-6">
        {/* ロゴエリア */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4">
            <Image
              src="/images/mascot/bivox_fox_face_cutout.png"
              alt="Bivox"
              width={96}
              height={96}
              className="drop-shadow-lg"
              priority
            />
          </div>
          <p className="text-gray-500 text-sm">アカウントにログイン</p>
        </div>

        {/* メール認証完了メッセージ */}
        {verifiedSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-700 font-medium text-sm">
                メール認証が完了しました！
              </p>
            </div>
            <p className="text-green-600 text-xs text-center mt-1">
              {isExternalBrowserVerified
                ? 'Bivoxアプリを開いてログインしてください'
                : 'ログインしてアプリをご利用ください'}
            </p>
            {showOpenAppButton && (
              <>
                <a
                  href={getPreferredAppOpenUrl()}
                  className="mt-3 block w-full py-3 bg-white border border-green-200 text-green-700 rounded-xl font-bold text-sm text-center"
                >
                  Bivoxアプリを開く
                </a>
                <p className="mt-2 text-[11px] text-green-700 text-center">
                  開かない場合は上のボタンをもう一度押してください
                </p>
              </>
            )}
          </div>
        )}

        {isExternalBrowserVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-amber-800 text-sm text-center leading-relaxed">
              認証は完了しています。<br />
              このブラウザではなく、Bivoxアプリに戻ってログインしてください。
            </p>
          </div>
        )}

        {/* Firebase使用時の注意書き */}
        {useFirebase && !verifiedSuccess && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-4">
            <p className="text-blue-700 text-xs text-center">
              📧 メール認証済みのアカウントでログインしてください
            </p>
          </div>
        )}

        {/* メールログインフォーム */}
        {!isExternalBrowserVerified && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5D4037] mb-1.5">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-[#FCC800] focus:bg-white transition-all text-gray-900 placeholder:text-gray-300"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5D4037] mb-1.5">
              パスワード
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                placeholder="6文字以上"
                className="w-full px-4 py-3.5 pr-12 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-[#FCC800] focus:bg-white transition-all text-gray-900 placeholder:text-gray-300"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400 transition-colors hover:text-[#5D4037]"
                aria-label={showPassword ? 'パスワードを非表示' : 'パスワードを表示'}
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 5.09A9.77 9.77 0 0112 4.5c4.77 0 8.73 3.12 9.5 7.5a9.78 9.78 0 01-4.04 5.94M6.1 6.1A9.76 9.76 0 002.5 12c.46 2.61 2.05 4.84 4.28 6.12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.5 12C3.27 7.62 7.23 4.5 12 4.5S20.73 7.62 21.5 12c-.77 4.38-4.73 7.5-9.5 7.5S3.27 16.38 2.5 12z" />
                    <circle cx="12" cy="12" r="3" strokeWidth={2} />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {/* メインアクションボタン - イエロー背景 + 濃い茶色テキスト */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-[#FFE566] to-[#FCC800] text-[#5D4037] font-black text-lg rounded-2xl shadow-[0_4px_15px_rgba(252,200,0,0.4)] hover:shadow-[0_6px_20px_rgba(252,200,0,0.5)] transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
          </form>
        )}

        {/* 新規登録リンク */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm mb-2">アカウントをお持ちでない方</p>
          <HardNavLink
            href="/auth/register"
            className="text-[#5D4037] font-bold hover:text-[#4E342E] underline underline-offset-2"
          >
            新規登録はこちら
          </HardNavLink>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
      <LoginPageInner />
    </Suspense>
  );
}
