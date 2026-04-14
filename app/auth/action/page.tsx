'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppRouter } from '@/hooks/useAppRouter';
import { applyActionCode, getAuth } from 'firebase/auth';
import { isFirebaseConfigured } from '@/lib/firebase';

function AuthActionPageInner() {
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('認証を処理中...');

  useEffect(() => {
    const handleAction = async () => {
      const mode = searchParams.get('mode');
      const oobCode = searchParams.get('oobCode');

      if (!isFirebaseConfigured()) {
        setStatus('error');
        setMessage('Firebase が設定されていません');
        return;
      }

      if (!oobCode) {
        setStatus('error');
        setMessage('無効なリンクです');
        return;
      }

      const auth = getAuth();

      try {
        switch (mode) {
          case 'verifyEmail':
            // メールアドレス確認
            await applyActionCode(auth, oobCode);
            setStatus('success');
            setMessage('メール認証が完了しました！');
            // 2秒後にログインページへリダイレクト
            setTimeout(() => {
              router.push('/auth/verified');
            }, 2000);
            break;

          case 'resetPassword':
            // パスワードリセット - Firebase Consoleのデフォルトページを使用
            // またはカスタムパスワードリセットページを作成
            router.push(`/auth/reset-password?oobCode=${oobCode}`);
            break;

          case 'recoverEmail':
            // メールアドレス復元
            await applyActionCode(auth, oobCode);
            setStatus('success');
            setMessage('メールアドレスが復元されました');
            setTimeout(() => {
              router.push('/auth/login');
            }, 2000);
            break;

          default:
            setStatus('error');
            setMessage('不明なアクションです');
        }
      } catch (error: unknown) {
        console.error('Auth action error:', error);
        const firebaseError = error as { code?: string; message?: string };

        let errorMessage = '処理中にエラーが発生しました';
        switch (firebaseError.code) {
          case 'auth/invalid-action-code':
            errorMessage = 'このリンクは無効または期限切れです';
            break;
          case 'auth/expired-action-code':
            errorMessage = 'このリンクは期限切れです';
            break;
          case 'auth/user-disabled':
            errorMessage = 'このアカウントは無効化されています';
            break;
          case 'auth/user-not-found':
            errorMessage = 'ユーザーが見つかりません';
            break;
        }

        setStatus('error');
        setMessage(errorMessage);
      }
    };

    handleAction();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto relative shadow-xl">
      {/* ヘッダー */}
      <header className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-center">
          <h1 className="text-lg font-bold text-[#5D4037]">認証処理</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center">
        {status === 'processing' && (
          <>
            {/* ローディングスピナー */}
            <div className="w-16 h-16 border-4 border-[#FCC800] border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-gray-600 text-center">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            {/* 成功アイコン */}
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
            <h2 className="text-xl font-bold text-[#5D4037] mb-3">{message}</h2>
            <p className="text-gray-500 text-sm text-center">
              ログインページへ移動します...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            {/* エラーアイコン */}
            <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <svg
                className="w-12 h-12 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#5D4037] mb-3">エラー</h2>
            <p className="text-gray-600 text-center mb-6">{message}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="px-6 py-3 bg-gradient-to-r from-[#FFE566] to-[#FCC800] text-[#5D4037] font-bold rounded-2xl shadow-lg"
            >
              ログインページへ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
      <AuthActionPageInner />
    </Suspense>
  );
}
