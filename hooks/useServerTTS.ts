'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiFetch } from '@/utils/api';

/**
 * サーバーTTS APIを使った音声再生フック
 * Capacitor WebViewでspeechSynthesisが動作しない問題を回避
 *
 * - サーバーTTS API（OpenAI）で音声を生成・再生
 * - API失敗時はspeechSynthesisにフォールバック
 */
export function useServerTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (mountedRef.current) {
      setIsSpeaking(false);
    }
  }, []);

  /**
   * speechSynthesisで読み上げる（フォールバック用）
   */
  const speakWithBrowserTTS = useCallback((text: string, lang: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (mountedRef.current) setIsSpeaking(false);
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);

      // 安全タイムアウト（10秒）
      const timer = setTimeout(finish, 10000);
    });
  }, []);

  /**
   * テキストを読み上げる
   * サーバーTTS APIを優先し、失敗時はspeechSynthesisにフォールバック
   */
  const speak = useCallback(async (text: string, lang: string = 'en-US') => {
    if (!text) return;

    stop();
    if (mountedRef.current) setIsSpeaking(true);

    try {
      const response = await apiFetch('/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text,
          lang: lang.startsWith('ja') ? 'ja' : 'en',
        }),
      });

      if (!response.ok) throw new Error('TTS API error');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (mountedRef.current) setIsSpeaking(false);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (mountedRef.current) setIsSpeaking(false);
          resolve();
        };
        audio.play().catch(() => {
          URL.revokeObjectURL(url);
          if (mountedRef.current) setIsSpeaking(false);
          resolve();
        });
      });
    } catch {
      // サーバーTTS失敗時はブラウザTTSにフォールバック
      await speakWithBrowserTTS(text, lang);
    }
  }, [stop, speakWithBrowserTTS]);

  return { speak, stop, isSpeaking };
}
