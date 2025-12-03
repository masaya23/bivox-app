'use client';

import { useState } from 'react';
import { Sentence } from '@/types/sentence';

export default function TestGeneratePage() {
  const [loading, setLoading] = useState(false);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [error, setError] = useState<string>('');
  const [attemptCount, setAttemptCount] = useState(0);

  const generateSentences = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate-sentences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: 5,
          level: 'A1',
          tags: ['日常会話'],
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '生成に失敗しました');
      }

      setSentences(data.sentences);
      setAttemptCount((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          例文生成テスト
        </h1>

        <div className="mb-6">
          <button
            onClick={generateSentences}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '生成中...' : '例文を5個生成'}
          </button>

          <p className="mt-2 text-sm text-gray-600">
            生成回数: {attemptCount} 回
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="font-semibold">エラー:</p>
            <p>{error}</p>
          </div>
        )}

        {sentences.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              生成された例文（{sentences.length}個）
            </h2>

            {sentences.map((sentence, index) => (
              <div
                key={sentence.id}
                className="p-6 bg-white rounded-lg shadow-md border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-500">
                    #{index + 1}
                  </span>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">
                      {sentence.level}
                    </span>
                    {sentence.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-lg text-gray-800">
                    <span className="font-semibold text-gray-500">🇯🇵</span>{' '}
                    {sentence.jp}
                  </p>
                  <p className="text-lg text-gray-800">
                    <span className="font-semibold text-gray-500">🇬🇧</span>{' '}
                    {sentence.en}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
