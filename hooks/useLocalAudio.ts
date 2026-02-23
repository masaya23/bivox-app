import { useState, useCallback, useRef, useEffect } from 'react';

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
  const speakWithTTS = useCallback((text: string, ttsLang: string, playbackRate?: number): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      // 既存の再生を停止
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = ttsLang;
      const defaultRate = ttsLang.startsWith('ja') ? 1.0 : 0.9;
      utterance.rate = typeof playbackRate === 'number' ? playbackRate : defaultRate;

      utterance.onend = () => {
        if (mountedRef.current) {
          setIsSpeaking(false);
        }
        resolve();
      };

      utterance.onerror = () => {
        if (mountedRef.current) {
          setIsSpeaking(false);
        }
        resolve();
      };

      if (mountedRef.current) {
        setIsSpeaking(true);
      }

      window.speechSynthesis.speak(utterance);
    });
  }, []);

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

          audio.onended = () => {
            if (mountedRef.current) {
              setIsSpeaking(false);
            }
            cleanupAudio();
            safeResolve();
          };

          audio.onerror = async () => {
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
              await speakWithTTS(fallbackText, ttsLang, playbackRate);
            } else {
              if (mountedRef.current) {
                setIsSpeaking(false);
              }
            }
            safeResolve();
          };

          // キャンセルチェック
          if (currentTokenRef.current !== token) {
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
              cleanupAudio();
              if (fallbackText) {
                await speakWithTTS(fallbackText, ttsLang, playbackRate);
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
            // タイムアウトフォールバック
            setTimeout(() => {
              if (audio.readyState >= 2 && currentTokenRef.current === token) {
                startPlayback();
              }
            }, 300);
          }
        });
      } catch (error) {
        // エラー時もTTSにフォールバック
        cleanupAudio();
        if (fallbackText) {
          await speakWithTTS(fallbackText, ttsLang, playbackRate);
        } else {
          if (mountedRef.current) {
            setIsSpeaking(false);
          }
        }
      }
    },
    [lang, cleanupAudio, speakWithTTS]
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
