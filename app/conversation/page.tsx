'use client';

import { useState, useRef, useEffect } from 'react';
import HardNavLink from '@/components/HardNavLink';
import { Message, ConversationSettings } from '@/types/conversation';
import { apiFetch } from '@/utils/api';
import { useServerTTS } from '@/hooks/useServerTTS';
import { recordLearningTime } from '@/utils/learningTime';
import { recordSession } from '@/utils/sessionLog';

export default function ConversationPage() {
  const serverTTS = useServerTTS();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState<ConversationSettings>({
    userLevel: 'intermediate',
    correctionMode: 'realtime',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isInitialized = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const interimTranscriptRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now()); // 学習開始時刻
  const SILENCE_TIMEOUT_MS = 1500;


  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 音声認識の初期化（1回のみ）
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let fullTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          fullTranscript += transcript + ' ';
        }

        interimTranscriptRef.current = fullTranscript.trim();

        if (event.results[event.results.length - 1].isFinal) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          silenceTimerRef.current = setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (e) {
                console.error('Stop error:', e);
              }
            }
          }, 1500);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('Speech recognition error:', event.error);
        }

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }

        setIsRecording(false);

        if (event.error !== 'no-speech') {
          setError('音声認識エラーが発生しました');
        }
      };

      recognitionRef.current.onend = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        setIsRecording(false);

        // 即座にメッセージを送信
        const transcript = interimTranscriptRef.current.trim();
        if (transcript) {
          handleUserMessage(transcript);
          interimTranscriptRef.current = '';
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Cleanup stop error:', e);
        }
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []); // 空の依存配列で1回のみ初期化

  // ユーザーメッセージを処理
  const handleUserMessage = async (content: string) => {
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
        timestamp: Date.now(),
        correction: data.correction,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // AIの応答を音声で読み上げ
      speak(data.response);
    } catch (error) {
      console.error('Error:', error);
      setError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  // 音声認識開始（TTS再生中なら停止してからマイク開始）
  const startRecording = () => {
    if (!recognitionRef.current) {
      setError('音声認識が利用できません（Chrome推奨）');
      return;
    }
    // TTS再生中なら停止（初回メッセージ等のスキップ用）
    serverTTS.stop();
    setError(null);
    interimTranscriptRef.current = '';
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    setIsRecording(true);
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error('Recognition start error:', e);
    }
  };

  // 音声認識停止
  const stopRecording = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Stop recording error:', e);
        try {
          recognitionRef.current.abort();
        } catch (abortError) {
          console.error('Abort recording error:', abortError);
        }
      }
    }

    setIsRecording(false);
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
        timestamp: Date.now(),
        correction: data.correction,
      };

      setMessages((prev) => [...prev, aiMessage]);
      speak(data.response);
    } catch (error) {
      console.error('Error:', error);
      setError('エラーが発生しました。もう一度お試しください。');
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

  return (
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
            className="hover:scale-110 transition-transform min-w-[40px] flex items-center justify-end"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
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
                    {message.correction && (
                      <div className="mt-2 pt-2 border-t border-gray-300 text-xs">
                        <p className="font-semibold text-orange-600">
                          添削:
                        </p>
                        <p className="text-gray-600">
                          {message.correction.corrected}
                        </p>
                      </div>
                    )}
                    {message.role === 'user' && (
                      <button
                        onClick={() => startEditMessage(message)}
                        className="mt-2 text-xs opacity-70 hover:opacity-100"
                      >
                        編集
                      </button>
                    )}
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => speak(message.content)}
                        className="mt-2 text-xs opacity-70 hover:opacity-100"
                      >
                        もう一度聞く
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
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

      {/* 音声入力ボタン */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="text-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || editingMessageId !== null}
            className={`w-16 h-16 rounded-full font-bold text-white text-xl transition-all transform ${
              isRecording
                ? 'bg-red-500 animate-pulse scale-110'
                : 'bg-gradient-to-r from-green-500 to-blue-500 hover:scale-105'
            } ${
              isProcessing || editingMessageId !== null ? 'opacity-50 cursor-not-allowed' : ''
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
              '🎤'
            )}
          </button>
          <p className="mt-2 text-gray-600 font-semibold text-sm">
            {isRecording
              ? '話してください...'
              : isProcessing
              ? 'AIが考えています...'
              : editingMessageId !== null
              ? 'メッセージを編集中...'
              : 'タップして話す'}
          </p>
        </div>
      </div>
    </div>
  );
}
