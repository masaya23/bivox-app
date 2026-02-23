'use client';

import { useState } from 'react';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 問い合わせカテゴリー
const CONTACT_CATEGORIES = [
  { id: 'bug', label: '不具合・バグ報告', icon: '🐛' },
  { id: 'feature', label: '機能リクエスト', icon: '💡' },
  { id: 'billing', label: '課金・支払いについて', icon: '💳' },
  { id: 'account', label: 'アカウントについて', icon: '👤' },
  { id: 'other', label: 'その他', icon: '📝' },
];

export default function ContactFormModal({ isOpen, onClose }: ContactFormModalProps) {
  const [category, setCategory] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!category || !message.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // TODO: 実際のAPI送信処理を実装
      // 現在はモック処理（デモ用）
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 送信データの例（将来的にFirebaseやAPIに送信）
      const contactData = {
        category,
        email: email.trim() || null,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      };

      console.log('Contact form submitted:', contactData);

      setSubmitStatus('success');
    } catch (error) {
      console.error('Contact form error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // フォームをリセット
    setCategory('');
    setEmail('');
    setMessage('');
    setSubmitStatus('idle');
    onClose();
  };

  // 送信完了画面
  if (submitStatus === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-[400px] mx-4 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">
                送信完了
              </h3>
              <p className="text-gray-500 text-sm">
                お問い合わせありがとうございます
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-center">
              <p className="text-gray-600 text-sm">
                内容を確認し、必要に応じてご連絡いたします。
                {email && (
                  <>
                    <br />
                    返信先: {email}
                  </>
                )}
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-[430px] h-full max-h-screen overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100 z-10">
          <div className="flex items-center justify-between">
            <button
              onClick={handleClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
            <h1 className="text-lg font-black text-gray-800">お問い合わせ</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="px-4 py-6">
          {/* カテゴリー選択 */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              お問い合わせの種類 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {CONTACT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`
                    w-full py-3 px-4 rounded-xl border-2 text-left text-sm font-medium transition-all
                    flex items-center gap-3
                    ${category === cat.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="text-lg">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* メールアドレス（任意） */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              メールアドレス（任意）
            </label>
            <p className="text-xs text-gray-500 mb-2">
              返信が必要な場合はご入力ください
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* メッセージ */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              お問い合わせ内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="できるだけ詳しくお書きください。不具合の場合は、どのような操作をしたときに発生したかもご記入いただけると助かります。"
              rows={6}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {message.length} 文字
            </p>
          </div>

          {/* エラー表示 */}
          {submitStatus === 'error' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
              <p className="text-red-600 text-sm">
                送信に失敗しました。しばらく経ってから再度お試しください。
              </p>
            </div>
          )}

          {/* 送信ボタン */}
          <button
            onClick={handleSubmit}
            disabled={!category || !message.trim() || isSubmitting}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg text-white
              bg-gradient-to-r from-blue-500 to-cyan-500
              active:scale-[0.98] transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg
            `}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                送信中...
              </span>
            ) : (
              '送信する'
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            お問い合わせ内容は改善のために活用させていただきます
          </p>
        </div>
      </div>
    </div>
  );
}
