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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // クリーンアップ
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    // 進行中のAPIリクエストをキャンセル
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    speakingLockRef.current = false;
    if (mountedRef.current) {
      setIsSpeaking(false);
    }
  }, []);

  /**
   * テキストを読み上げる
   * サーバーTTS APIで音声を生成し、Audioで再生
   * Promiseは再生完了（またはエラー）時にresolveする
   */
  const speak = useCallback(async (text: string, lang: string = 'en-US'): Promise<void> => {
    if (!text) return;

    // 前回の再生を停止
    stop();

    // 重複防止ロック
    if (speakingLockRef.current) return;
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

      if (abortController.signal.aborted) return;
      if (!response.ok) throw new Error('TTS API error');

      const blob = await response.blob();
      if (abortController.signal.aborted) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        const cleanup = () => {
          URL.revokeObjectURL(url);
          speakingLockRef.current = false;
          if (mountedRef.current) setIsSpeaking(false);
          resolve();
        };

        audio.onended = cleanup;
        audio.onerror = cleanup;

        audio.play().catch(() => {
          cleanup();
        });
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      speakingLockRef.current = false;
      if (mountedRef.current) setIsSpeaking(false);
    }
  }, [stop]);

  return { speak, stop, isSpeaking };
}
