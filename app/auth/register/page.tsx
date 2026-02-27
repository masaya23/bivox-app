'use client';

import { useState } from 'react';
import Image from 'next/image';
import HardNavLink from '@/components/HardNavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useAppRouter } from '@/hooks/useAppRouter';

export default function RegisterPage() {
  const router = useAppRouter();
  const { signUp, useFirebase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // バリデーション
      if (!email || !password || !confirmPassword) {
        setError('すべての項目を入力してください');
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('パスワードは6文字以上で入力してください');
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('パスワードが一致しません');
        setIsLoading(false);
        return;
      }

      // AuthContextのsignUpを使用
      const result = await signUp(email, password);

      if (result.success) {
        if (result.needsVerification) {
          // メール認証が必要な場合
          setRegisteredEmail(email);
          setNeedsVerification(true);
        } else {
          // ローカル認証の場合は直接チュートリアルへ
          router.push('/tutorial');
        }
      } else {
        setError(result.error?.message || '登録に失敗しました');
      }
    } catch {
      setError('登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // メール認証待ち画面
  if (needsVerification) {
    return (
      <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto relative shadow-xl">
        {/* ヘッダー */}
        <header className="bg-white px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="w-10" />
            <h1 className="text-lg font-bold text-[#5D4037]">メール認証</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* メインコンテンツ */}
        <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center">
          {/* メールアイコン */}
          <div className="w-24 h-24 bg-gradient-to-br from-[#FFE566] to-[#FCC800] rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg
              className="w-12 h-12 text-[#5D4037]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-[#5D4037] mb-3">
            確認メールを送信しました
          </h2>

          <p className="text-gray-600 text-center mb-2">
            <span className="font-medium text-[#5D4037]">{registeredEmail}</span>
          </p>

          <p className="text-gray-500 text-sm text-center mb-6 leading-relaxed">
            上記のメールアドレスに確認メールを送信しました。<br />
            メール内のリンクをクリックして、<br />
            アカウントを有効化してください。
          </p>

          {/* 手順説明 */}
          <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6">
            <p className="text-[#5D4037] font-bold text-sm mb-2 text-center">📋 認証の手順</p>
            <ol className="text-gray-600 text-sm space-y-1 list-decimal list-inside">
              <li>メールを開いてリンクをクリック</li>
              <li>「認証完了」の画面が表示される</li>
              <li>このアプリに戻ってログイン</li>
            </ol>
          </div>

          {/* 注意事項 */}
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <p className="text-amber-800 text-sm text-center">
              📧 メールが届かない場合は、迷惑メールフォルダをご確認ください
            </p>
          </div>

          {/* ログインページへ */}
          <HardNavLink
            href="/auth/login"
            className="w-full py-4 bg-gradient-to-r from-[#FFE566] to-[#FCC800] text-[#5D4037] font-black text-lg rounded-2xl shadow-[0_4px_15px_rgba(252,200,0,0.4)] hover:shadow-[0_6px_20px_rgba(252,200,0,0.5)] transition-all text-center block"
          >
            ログインページへ
          </HardNavLink>

          <p className="mt-4 text-gray-500 text-sm text-center">
            メールを確認後、ログインしてください
          </p>
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
          <h1 className="text-lg font-bold text-[#5D4037]">新規登録</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* ロゴエリア */}
        <div className="text-center mb-6">
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
          <p className="text-gray-500 text-sm">無料でアカウントを作成</p>
        </div>

        {/* Firebase使用時の注意書き */}
        {useFirebase && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-4">
            <p className="text-blue-700 text-xs text-center">
              📧 登録後、確認メールが届きます。メール内のリンクをクリックしてアカウントを有効化してください。
            </p>
          </div>
        )}

        {/* メール登録フォーム */}
        <form onSubmit={handleEmailRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5D4037] mb-1.5">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-[#FCC800] focus:bg-white transition-all"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5D4037] mb-1.5">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-[#FCC800] focus:bg-white transition-all"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5D4037] mb-1.5">
              パスワード（確認）
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力"
              className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-[#FCC800] focus:bg-white transition-all"
              disabled={isLoading}
            />
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
            {isLoading ? '登録中...' : '無料で登録'}
          </button>
        </form>

        {/* 利用規約 */}
        <p className="mt-4 text-xs text-gray-500 text-center leading-relaxed">
          登録することで、
          <a href="/terms" className="text-[#5D4037] font-medium hover:underline">利用規約</a>
          および
          <a href="/privacy" className="text-[#5D4037] font-medium hover:underline">プライバシーポリシー</a>
          に同意したものとみなされます。
        </p>

        {/* ログインリンク */}
        <div className="mt-6 text-center pb-4">
          <p className="text-gray-500 text-sm mb-2">すでにアカウントをお持ちの方</p>
          <HardNavLink
            href="/auth/login"
            className="text-[#5D4037] font-bold hover:text-[#4E342E] underline underline-offset-2"
          >
            ログインはこちら
          </HardNavLink>
        </div>
      </div>
    </div>
  );
}
