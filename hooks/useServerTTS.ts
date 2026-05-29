'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiFetch } from '@/utils/api';

/**
 * サーバーTTS APIを使った音声再生フック
 * Capacitor WebViewでspeechSynthesisが動作しない問題を回避
 *
 * - サーバーTTS API（OpenAI）で音声を生成・再生
 * - 重複呼び出し防止（speakingLock）
 * - Capacitor WebViewはデフォルトでautoplayを許可するためunlock不要
 */
export function useServerTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);
  const speakingLockRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const tokenRef = useRef(0);

  const cleanupAudio = useCallback((targetAudio?: HTMLAudioElement | null) => {
    const audio = targetAudio ?? audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.volume = 0;
      audio.pause();
      try { audio.currentTime = 0; } catch { /* ignore */ }
      audio.removeAttribute('src');
      try { audio.load(); } catch { /* ignore */ }
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      tokenRef.current += 1;
      // クリーンアップ
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      cleanupAudio();
    };
  }, [cleanupAudio]);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    // 進行中のAPIリクエストをキャンセル
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    cleanupAudio();
    speakingLockRef.current = false;
    if (mountedRef.current) {
      setIsSpeaking(false);
    }
  }, [cleanupAudio]);

  /**
   * テキストを読み上げる
   * サーバーTTS APIで音声を生成し、Audioで再生
   * Promiseは再生完了（またはエラー）時にresolveする
   */
  const speak = useCallback(async (text: string, lang: string = 'en-US'): Promise<void> => {
    if (!text) return;

    // 前回の再生を停止（ロックも解放される）
    stop();
    const token = tokenRef.current;

    // ロックを取得
    speakingLockRef.current = true;
    if (mountedRef.current) setIsSpeaking(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await apiFetch('/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text,
          lang: lang.startsWith('ja') ? 'ja' : 'en',
        }),
        signal: abortController.signal,
      });

      if (abortController.signal.aborted || tokenRef.current !== token) return;
      if (!response.ok) throw new Error('TTS API error');

      const blob = await response.blob();
      if (abortController.signal.aborted || tokenRef.current !== token) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      if (tokenRef.current !== token) {
        URL.revokeObjectURL(url);
        return;
      }
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        const cleanup = () => {
          URL.revokeObjectURL(url);
          if (tokenRef.current === token) {
            cleanupAudio(audio);
            speakingLockRef.current = false;
            if (mountedRef.current) setIsSpeaking(false);
          } else {
            cleanupAudio(audio);
          }
          resolve();
        };

        audio.onended = cleanup;
        audio.onerror = cleanup;

        if (tokenRef.current !== token) {
          cleanup();
          return;
        }

        audio.play().catch(() => {
          cleanup();
        });
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      if (tokenRef.current === token) {
        speakingLockRef.current = false;
        if (mountedRef.current) setIsSpeaking(false);
      }
    } finally {
      if (abortRef.current === abortController) {
        abortRef.current = null;
      }
    }
  }, [cleanupAudio, stop]);

  return { speak, stop, isSpeaking };
}
