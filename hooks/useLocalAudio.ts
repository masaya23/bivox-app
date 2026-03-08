import { useState, useCallback, useRef, useEffect } from 'react';
import { apiFetch } from '@/utils/api';

interface LocalAudioOptions {
  lang?: 'ja' | 'en';
  fallbackText?: string; // TTSフォールバック用のテキスト
}

/**
 * ローカルMP3ファイルを再生するフック
 * public/audio/{lang}/{sentenceId}.mp3 から音声を再生
 */
export function useLocalAudio(options: LocalAudioOptions = {}) {
  const { lang = 'en' } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTokenRef = useRef<number | null>(null);
  const pendingResolveRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // クリーンアップ
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  /**
   * Web Speech API (TTS) を使って読み上げる（フォールバック用）
   */
  /**
   * サーバーTTS APIで音声を生成・再生（Capacitor WebView対応）
   */
  const speakWithServerTTS = useCallback(async (text: string, ttsLang: string, unlockedAudio?: HTMLAudioElement): Promise<void> => {
    try {
      const response = await apiFetch('/api/tts', {
        method: 'POST',
        body: JSON.stringify({ text, lang: ttsLang.startsWith('ja') ? 'ja' : 'en' }),
      });

      if (!response.ok) {
        if (mountedRef.current) setIsSpeaking(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      // unlock済みのAudio要素があればそれを再利用、なければ新規作成
      const audio = unlockedAudio || new Audio();
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (mountedRef.current) setIsSpeaking(false);
          cleanupAudio();
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (mountedRef.current) setIsSpeaking(false);
          cleanupAudio();
          resolve();
        };
        audio.src = url;
        audio.play().catch(() => {
          URL.revokeObjectURL(url);
          if (mountedRef.current) setIsSpeaking(false);
          cleanupAudio();
          resolve();
        });
      });
    } catch {
      if (mountedRef.current) setIsSpeaking(false);
    }
  }, [cleanupAudio]);

  /**
   * 音声を再生
   * @param sentenceId センテンスID (例: "unit1-p1-s1")
   * @param customLang 言語 ('ja' | 'en')
   * @param playToken キャンセル用トークン
   * @param fallbackText ローカルファイルがない場合のTTSフォールバック用テキスト
   * @param playbackRate 再生速度（1.0が標準）
   */
  const speak = useCallback(
    async (
      sentenceId: string,
      customLang?: 'ja' | 'en',
      playToken?: number,
      fallbackText?: string,
      playbackRate?: number
    ): Promise<void> => {
      if (!sentenceId) return;

      const token = playToken ?? Date.now();
      currentTokenRef.current = token;

      if (pendingResolveRef.current) {
        pendingResolveRef.current();
        pendingResolveRef.current = null;
      }

      // 既に再生中の場合は停止
      cleanupAudio();

      if (mountedRef.current) {
        setIsSpeaking(true);
      }

      const effectiveLang = customLang || lang;
      const audioPath = `/audio/${effectiveLang}/${sentenceId}.mp3`;
      const ttsLang = effectiveLang === 'ja' ? 'ja-JP' : 'en-US';

      try {
        const audio = new Audio(audioPath);
        audioRef.current = audio;
        if (typeof playbackRate === 'number') {
          audio.playbackRate = playbackRate;
          audio.defaultPlaybackRate = playbackRate;
        }
        try {
          audio.currentTime = 0;
        } catch {
          // Ignore if not seekable yet
        }
        audio.preload = 'auto';

        await new Promise<void>((resolve, reject) => {
          let resolved = false;
          let started = false;
          const safeResolve = () => {
            if (resolved) return;
            resolved = true;
            if (pendingResolveRef.current === safeResolve) {
              pendingResolveRef.current = null;
            }
            resolve();
          };
          pendingResolveRef.current = safeResolve;

          // 安全タイムアウト: 15秒以内に再生が完了しない場合は強制解決
          const safetyTimeout = setTimeout(() => {
            if (mountedRef.current) {
              setIsSpeaking(false);
            }
            cleanupAudio();
            safeResolve();
          }, 15000);

          const safeResolveWithCleanup = () => {
            clearTimeout(safetyTimeout);
            safeResolve();
          };

          audio.onended = () => {
            if (mountedRef.current) {
              setIsSpeaking(false);
            }
            cleanupAudio();
            safeResolveWithCleanup();
          };

          audio.onerror = async () => {
            clearTimeout(safetyTimeout);
            if (currentTokenRef.current !== token || audio.src === '') {
              if (mountedRef.current) {
                setIsSpeaking(false);
              }
              cleanupAudio();
              safeResolve();
              return;
            }

            // ローカルファイルがない場合はTTSにフォールバック
            cleanupAudio();
            if (fallbackText) {
              await speakWithServerTTS(fallbackText, ttsLang);
            } else {
              if (mountedRef.current) {
                setIsSpeaking(false);
              }
            }
            safeResolve();
          };

          // キャンセルチェック
          if (currentTokenRef.current !== token) {
            clearTimeout(safetyTimeout);
            if (mountedRef.current) {
              setIsSpeaking(false);
            }
            cleanupAudio();
            safeResolve();
            return;
          }

          // 再生可能になるまで待つ
          const startPlayback = async () => {
            if (started) return;
            started = true;
            if (currentTokenRef.current !== token) {
              clearTimeout(safetyTimeout);
              if (mountedRef.current) {
                setIsSpeaking(false);
              }
              cleanupAudio();
              safeResolve();
              return;
            }

            try {
              try {
                audio.currentTime = 0;
              } catch {
                // Ignore if not seekable yet
              }
              await audio.play();
            } catch (err) {
              // 再生失敗時もTTSにフォールバック
              clearTimeout(safetyTimeout);
              cleanupAudio();
              if (fallbackText) {
                await speakWithServerTTS(fallbackText, ttsLang);
              } else {
                if (mountedRef.current) {
                  setIsSpeaking(false);
                }
              }
              safeResolve();
            }
          };

          if (audio.readyState >= 3) {
            startPlayback();
          } else {
            audio.addEventListener('canplaythrough', startPlayback, { once: true });
            // タイムアウトフォールバック: 読み込み待ち
            setTimeout(() => {
              if (!started && currentTokenRef.current === token) {
                if (audio.readyState >= 2) {
                  startPlayback();
                } else {
                  // 音声が全く読み込めない場合はTTSフォールバック
                  clearTimeout(safetyTimeout);
                  cleanupAudio();
                  if (fallbackText) {
                    speakWithServerTTS(fallbackText, ttsLang).then(safeResolve);
                  } else {
                    if (mountedRef.current) {
                      setIsSpeaking(false);
                    }
                    safeResolve();
                  }
                }
              }
            }, 3000);
          }
        });
      } catch (error) {
        // エラー時もTTSにフォールバック
        cleanupAudio();
        if (fallbackText) {
          await speakWithServerTTS(fallbackText, ttsLang);
        } else {
          if (mountedRef.current) {
            setIsSpeaking(false);
          }
        }
      }
    },
    [lang, cleanupAudio, speakWithServerTTS]
  );

  /**
   * テキストから音声を再生（後方互換性のため）
   * sentenceIdを渡す代わりにテキストを渡した場合のフォールバック
   */
  const speakText = useCallback(
    async (text: string, customLang?: 'ja' | 'en', playToken?: number): Promise<void> => {
      // テキストが渡された場合は従来のOpenAI TTS APIを使用
      // この関数は移行期間中のフォールバック用
      console.warn('speakText is deprecated, use speak with sentenceId instead');
      return Promise.resolve();
    },
    []
  );

  const stop = useCallback(() => {
    currentTokenRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (pendingResolveRef.current) {
      pendingResolveRef.current();
      pendingResolveRef.current = null;
    }
    cleanupAudio();
    if (mountedRef.current) {
      setIsSpeaking(false);
    }
  }, [cleanupAudio]);

  return {
    speak,
    speakText,
    stop,
    isSpeaking,
  };
}
