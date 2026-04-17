'use client';

import { useState, useRef, useEffect } from 'react';
import HardNavLink from '@/components/HardNavLink';
import { Message, ConversationSettings } from '@/types/conversation';
import { apiFetch } from '@/utils/api';
import { useServerTTS } from '@/hooks/useServerTTS';
import { useWhisperRecognition } from '@/hooks/useWhisperRecognition';
import { recordLearningTime } from '@/utils/learningTime';
import { recordSession } from '@/utils/sessionLog';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppRouter } from '@/hooks/useAppRouter';
import { isGuestUser } from '@/utils/guestAccess';
import PaywallScreen from '@/components/subscription/PaywallScreen';

export default function ConversationPage() {
  const router = useAppRouter();
  const serverTTS = useServerTTS();
  const whisper = useWhisperRecognition();
  const { isLoading: isSubscriptionLoading, canAccessMode } = useSubscription();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState<ConversationSettings>({
    userLevel: 'intermediate',
    correctionMode: 'realtime',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [expandedTranslations, setExpandedTranslations] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const isGuest = isGuestUser(user);
  const canAccessConversation = canAccessMode('ai-conversation');

  useEffect(() => {
    if (isGuest) {
      router.replace('/auth/register');
    }
  }, [isGuest, router]);

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ユーザーメッセージを処理
  const handleUserMessage = async (content: string) => {
    if (isSubscriptionLoading) {
      return;
    }
    setError(null);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const response = await apiFetch('/api/conversation', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...messages, userMessage],
          settings,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        translation: data.translation ?? undefined,
        timestamp: Date.now(),
        correction: data.correction,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // AIの応答を音声で読み上げ
      speak(data.response);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  // 音声認識開始（Whisper API使用）
  const startRecording = () => {
    if (isSubscriptionLoading) {
      return;
    }
    // TTS再生中なら停止（初回メッセージ等のスキップ用）
    serverTTS.stop();
    setError(null);

    whisper.startListening({
      silenceTimeout: 3,
      noSpeechTimeout: 10,
      onResult: (text: string) => {
        if (text.trim()) {
          handleUserMessage(text.trim());
        }
      },
      onNoSpeech: () => {
        // 発話なし — 何もしない
      },
      onError: (msg: string) => {
        setError(msg);
      },
    });
  };

  // 音声認識停止
  const stopRecording = () => {
    whisper.stopListening();
  };

  // テキスト読み上げ（サーバーTTS API使用）
  const speak = (text: string) => {
    serverTTS.speak(text, 'en-US');
  };

  // メッセージの編集開始
  const startEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingText(message.content);
  };

  // メッセージの編集をキャンセル
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  // メッセージの編集を保存して再送信
  const saveEdit = async () => {
    if (!editingMessageId || !editingText.trim()) return;

    // 編集されたメッセージのインデックスを見つける
    const messageIndex = messages.findIndex(m => m.id === editingMessageId);
    if (messageIndex === -1) return;

    // 編集されたメッセージ以降を削除
    const newMessages = messages.slice(0, messageIndex);

    // 新しいメッセージとして追加
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: editingText.trim(),
      timestamp: Date.now(),
    };

    setMessages([...newMessages, newMessage]);
    setEditingMessageId(null);
    setEditingText('');
    setIsProcessing(true);

    try {
      const response = await apiFetch('/api/conversation', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...newMessages, newMessage],
          settings,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        translation: data.translation ?? undefined,
        timestamp: Date.now(),
        correction: data.correction,
      };

      setMessages((prev) => [...prev, aiMessage]);
      speak(data.response);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  // 会話をリセット
  const resetConversation = () => {
    setMessages([]);
    setError(null);
  };

  // 音声再生を停止
  const stopSpeech = () => {
    serverTTS.stop();
  };

  const sessionRecordedRef = useRef(false);
  const recordConversationSession = () => {
    if (sessionRecordedRef.current) return;
    sessionRecordedRef.current = true;
    const elapsedMinutes = Math.max(1, Math.ceil((Date.now() - startTimeRef.current) / 60000));
    recordLearningTime(elapsedMinutes);
    recordSession('AIとフリー英会話', elapsedMinutes, { unit: 'minutes' });
  };

  // ページ離脱時に音声再生を停止 & 学習時間を記録
  useEffect(() => {
    return () => {
      serverTTS.stop();
      recordConversationSession();
    };
  }, []);

  // 初回メッセージ（1回のみ実行）
  useEffect(() => {
    if (!isInitialized.current && messages.length === 0) {
      isInitialized.current = true;
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm here to help you practice English. Let's have a casual conversation! What would you like to talk about today?",
        timestamp: Date.now(),
      };
      setMessages([welcomeMessage]);
      // 少し遅延して音声再生（API初期化を待つ）
      setTimeout(() => {
        serverTTS.speak(welcomeMessage.content, 'en-US');
      }, 500);
    }
  }, []);

  const isRecording = whisper.isListening;
  const isTranscribing = whisper.isTranscribing;

  if (isGuest) {
    return null;
  }

  if (!isSubscriptionLoading && !canAccessConversation) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex flex-col max-w-[430px] mx-auto relative shadow-xl">
          <div className="px-4 py-4 sticky top-0 z-30" style={{ background: 'linear-gradient(to right, #8E4DFF, #D94D9E)' }}>
            <div className="flex items-center justify-between">
              <HardNavLink href="/home" className="text-white/80 hover:text-white font-semibold text-sm min-w-[60px]">
                ← ホーム
              </HardNavLink>
              <h1 className="text-xl font-black text-white">
                AIとフリー英会話
              </h1>
              <div className="min-w-[60px]" />
            </div>
          </div>

          <div className="flex-1 px-5 py-8 flex items-center justify-center">
            <div className="w-full rounded-3xl bg-white shadow-xl border border-purple-100 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center text-2xl font-black">
                AI
              </div>
              <h2 className="text-xl font-black text-gray-800 mb-3">Proプラン限定機能です</h2>
              <p className="text-sm text-gray-600 leading-6 mb-5">
                AIとフリー英会話は Proプランでご利用いただけます。
              </p>
              <button
                onClick={() => setShowPaywall(true)}
                className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 active:scale-[0.98] transition-transform"
              >
                プレミアムを見る
              </button>
            </div>
          </div>
        </div>

        <PaywallScreen
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          highlightedMode="ai-conversation"
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-[430px] mx-auto relative shadow-xl">
        {/* ヘッダー */}
        <div className="px-4 py-4 sticky top-0 z-30" style={{ background: 'linear-gradient(to right, #8E4DFF, #D94D9E)' }}>
          <div className="flex items-center justify-between">
            <HardNavLink
              href="/"
              className="text-white/80 hover:text-white font-semibold text-sm min-w-[60px]"
              onClick={() => {
                stopSpeech();
                recordConversationSession();
              }}
            >
              ← ホーム
            </HardNavLink>
            <h1 className="text-xl font-black text-white">
              AIとフリー英会話
            </h1>
            <button
              onClick={() => setShowSettings(!showSettings)}
              aria-label="設定"
              className="w-8 h-8 flex items-center justify-center"
            >
              <svg
                className="w-6 h-6 text-gray-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 00.12-.61l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.42 7.42 0 00-1.62-.94l-.36-2.54a.5.5 0 00-.47-.4h-3.84a.5.5 0 00-.47.4l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 00-.6.22l-1.92 3.32a.5.5 0 00.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 00-.12.61l1.92 3.32a.5.5 0 00.6.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.03.23.23.4.47.4h3.84c.24 0 .44-.17.47-.4l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96a.5.5 0 00.6-.22l1.92-3.32a.5.5 0 00-.12-.61l-2.03-1.58zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
              </svg>
            </button>
          </div>

        {/* 設定パネル */}
        {showSettings && (
          <div className="mt-4 p-4 bg-white/95 rounded-xl space-y-4">
            {/* レベル選択 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                英語レベル
              </label>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced'] as const).map(
                  (level) => (
                    <button
                      key={level}
                      onClick={() =>
                        setSettings({ ...settings, userLevel: level })
                      }
                      className={`flex-1 px-2 py-2 rounded-lg font-semibold transition-all text-xs ${
                        settings.userLevel === level
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {level === 'beginner' && '初級'}
                      {level === 'intermediate' && '中級'}
                      {level === 'advanced' && '上級'}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 添削モード */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                添削モード
              </label>
              <div className="flex gap-2">
                {(['realtime', 'summary', 'off'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() =>
                      setSettings({ ...settings, correctionMode: mode })
                    }
                    className={`flex-1 px-2 py-2 rounded-lg font-semibold transition-all text-xs ${
                      settings.correctionMode === mode
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {mode === 'realtime' && 'リアルタイム'}
                    {mode === 'summary' && 'まとめて'}
                    {mode === 'off' && 'なし'}
                  </button>
                ))}
              </div>
            </div>

            {/* リセットボタン */}
            <button
              onClick={resetConversation}
              className="w-full py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              会話をリセット
            </button>
          </div>
        )}
        </div>

        {/* チャットエリア */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-800 shadow-md'
                  }`}
                >
                {/* 編集モード */}
                {editingMessageId === message.id ? (
                  <div>
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full p-2 border-2 border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors text-xs"
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors text-xs"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    {message.role === 'user' && (
                      <button
                        onClick={() => startEditMessage(message)}
                        className="mt-2 text-xs opacity-70 hover:opacity-100"
                      >
                        編集
                      </button>
                    )}
                    {message.role === 'assistant' && (
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => speak(message.content)}
                          className="text-xs opacity-70 hover:opacity-100"
                        >
                          もう一度聞く
                        </button>
                        {message.translation && (
                          <button
                            onClick={() => {
                              setExpandedTranslations(prev => {
                                const next = new Set(prev);
                                if (next.has(message.id)) next.delete(message.id);
                                else next.add(message.id);
                                return next;
                              });
                            }}
                            className="text-xs text-purple-600 opacity-80 hover:opacity-100"
                          >
                            {expandedTranslations.has(message.id) ? '日本語訳を隠す' : '日本語訳を見る'}
                          </button>
                        )}
                      </div>
                    )}
                    {message.role === 'assistant' && message.translation && expandedTranslations.has(message.id) && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 leading-relaxed">
                        {message.translation}
                      </div>
                    )}
                    {message.correction && (
                      <div className="mt-2 pt-2 border-t border-gray-300 text-xs">
                        <p className="font-semibold text-orange-600">
                          添削:
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-600 flex-1">
                            {message.correction.corrected}
                          </p>
                          <button
                            onClick={() => speak(message.correction!.corrected)}
                            className="flex-shrink-0 w-7 h-7 min-w-[1.75rem] min-h-[1.75rem] bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
                            aria-label="添削を読み上げ"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                </div>
              </div>
            ))}
            {(isProcessing || isTranscribing) && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl p-4 shadow-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mx-4 mb-2 bg-red-100 border border-red-300 rounded-xl p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <p className="text-[10px] text-gray-400 text-center py-1">※AIの回答は必ずしも正確ではありません</p>

        {/* 音声入力ボタン */}
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <div className="text-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isTranscribing || editingMessageId !== null || isSubscriptionLoading}
              className={`w-16 h-16 mx-auto rounded-full font-bold text-white text-xl transition-all transform flex items-center justify-center ${
                isRecording
                  ? 'bg-red-500 animate-pulse scale-110'
                  : 'bg-gradient-to-r from-green-500 to-blue-500 hover:scale-105'
              } ${
                isProcessing || isTranscribing || editingMessageId !== null ? 'opacity-50 cursor-not-allowed' : ''
              } shadow-lg`}
            >
              {isRecording ? (
                <div className="flex items-center justify-center gap-[3px]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-[3px] bg-white rounded-full"
                      style={{
                        animation: 'soundWave 1s ease-in-out infinite',
                        animationDelay: `${i * 0.15}s`,
                        height: '8px',
                      }}
                    />
                  ))}
                </div>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0014 0" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 17v4M8 21h8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
              )}
            </button>
            <p className="mt-2 text-gray-600 font-semibold text-sm">
              {isSubscriptionLoading
                ? 'プラン確認中...'
                : isRecording
                ? '話してください...'
                : isTranscribing
                ? '文字起こし中...'
                : isProcessing
                ? 'AIが考えています...'
                : editingMessageId !== null
                ? 'メッセージを編集中...'
                : 'タップして話す'}
            </p>
          </div>
        </div>
      </div>

      <PaywallScreen
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        highlightedMode="ai-conversation"
      />
    </>
  );
}
