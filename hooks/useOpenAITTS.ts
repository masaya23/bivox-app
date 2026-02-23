import { useState, useCallback, useRef } from 'react';
import { getApiUrl } from '@/utils/api';

interface OpenAITTSOptions {
  lang?: 'ja' | 'en';
}

export function useOpenAITTS(options: OpenAITTSOptions = {}) {
  const { lang = 'en' } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const currentTokenRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cleanupAudio = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
  };

  const speak = useCallback(
    async (text: string, customLang?: 'ja' | 'en', playToken?: number): Promise<void> => {
      if (!text) return;

      const token = playToken ?? Date.now();
      currentTokenRef.current = token;

      // 既に再生中の場合は停止
      cleanupAudio();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSpeaking(true);

      try {
        const response = await fetch(getApiUrl('/api/tts'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            text,
            lang: customLang || lang,
          }),
        });

        if (!response.ok) {
          throw new Error('TTS生成に失敗しました');
        }

        // 取得中にキャンセルされた場合は抜ける
        if (currentTokenRef.current !== token) {
          setIsSpeaking(false);
          cleanupAudio();
          return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        currentUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.preload = 'auto';
        audio.currentTime = 0;

        const playbackPromise = new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            setIsSpeaking(false);
            cleanupAudio();
            resolve();
          };

          audio.onerror = () => {
            setIsSpeaking(false);
            cleanupAudio();
            reject(new Error('Audio playback error'));
          };
        });

        const startPlayback = async () => {
          if (currentTokenRef.current !== token) return;
          await audio.play().catch((err) => {
            setIsSpeaking(false);
            cleanupAudio();
            throw err;
          });
        };

        // 再生前にキャンセルされた場合は抜ける
        if (currentTokenRef.current !== token) {
          setIsSpeaking(false);
          cleanupAudio();
          return;
        }

        if (audio.readyState >= 3) {
          await startPlayback();
        } else {
          await new Promise<void>((resolve) => {
            audio.addEventListener('canplaythrough', () => resolve(), { once: true });
            setTimeout(() => resolve(), 500); // フォールバック
          });
          if (currentTokenRef.current !== token) {
            setIsSpeaking(false);
            cleanupAudio();
            return;
          }
          await startPlayback();
        }

        // 再生完了まで待つ
        await playbackPromise;
      } catch (error) {
        if ((error as any)?.name === 'AbortError') {
          setIsSpeaking(false);
          cleanupAudio();
          return;
        }
        console.error('TTS再生エラー:', error);
        setIsSpeaking(false);
        cleanupAudio();
      }
    },
    [lang]
  );

  const stop = useCallback(() => {
    // 進行中のfetch/再生を無効化
    currentTokenRef.current = null;
    cleanupAudio();
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
  };
}
