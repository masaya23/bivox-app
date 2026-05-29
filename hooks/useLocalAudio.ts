import { useCallback, useEffect, useRef, useState } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';
import { apiFetch } from '@/utils/api';

interface LocalAudioOptions {
  lang?: 'ja' | 'en';
  fallbackText?: string;
}

type AudioLang = 'ja' | 'en';

const isAndroidNativeAudioAvailable = () =>
  typeof window !== 'undefined' &&
  Capacitor.isNativePlatform() &&
  Capacitor.getPlatform() === 'android';

const getNativeAssetId = (audioLang: AudioLang, sentenceId: string) =>
  `${audioLang}:${sentenceId}`;

const getNativeAssetPath = (audioLang: AudioLang, sentenceId: string) =>
  `public/audio/${audioLang}/${sentenceId}.mp3`;

/**
 * ローカルMP3ファイルを再生するフック。
 *
 * - Android APK: @capacitor-community/native-audio で android assets 内のMP3をネイティブ再生
 * - Web / Androidで再生速度が1.0以外: HTMLAudioElementで従来通り再生
 */
export function useLocalAudio(options: LocalAudioOptions = {}) {
  const { lang = 'en' } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);

  const mountedRef = useRef(true);
  const tokenCounterRef = useRef(0);
  const currentTokenRef = useRef<number | null>(null);
  const pendingResolveRef = useRef<(() => void) | null>(null);

  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const htmlSafetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const htmlLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);

  const nativeAssetIdRef = useRef<string | null>(null);
  const nativeCompleteListenerRef = useRef<PluginListenerHandle | null>(null);
  const nativeConfiguredRef = useRef<Promise<void> | null>(null);

  const clearHtmlTimeouts = useCallback(() => {
    if (htmlSafetyTimeoutRef.current) {
      clearTimeout(htmlSafetyTimeoutRef.current);
      htmlSafetyTimeoutRef.current = null;
    }
    if (htmlLoadTimeoutRef.current) {
      clearTimeout(htmlLoadTimeoutRef.current);
      htmlLoadTimeoutRef.current = null;
    }
  }, []);

  const cleanupHtmlAudio = useCallback((targetAudio?: HTMLAudioElement | null) => {
    const audio = targetAudio ?? htmlAudioRef.current;
    if (!audio) return;

    audio.onended = null;
    audio.onerror = null;
    audio.volume = 0;
    audio.pause();
    try { audio.currentTime = 0; } catch { /* ignore */ }
    audio.removeAttribute('src');
    try { audio.load(); } catch { /* ignore */ }

    if (htmlAudioRef.current === audio) {
      htmlAudioRef.current = null;
    }
  }, []);

  const abortServerTTS = useCallback(() => {
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
  }, []);

  const cleanupNativeAudio = useCallback(async () => {
    const listener = nativeCompleteListenerRef.current;
    nativeCompleteListenerRef.current = null;
    if (listener) {
      await listener.remove().catch(() => {});
    }

    const assetId = nativeAssetIdRef.current;
    nativeAssetIdRef.current = null;
    if (assetId) {
      await NativeAudio.stop({ assetId }).catch(() => {});
      await NativeAudio.unload({ assetId }).catch(() => {});
    }
  }, []);

  const resolvePendingPlayback = useCallback(() => {
    if (pendingResolveRef.current) {
      pendingResolveRef.current();
      pendingResolveRef.current = null;
    }
  }, []);

  const stopAllAudio = useCallback(async () => {
    currentTokenRef.current = null;
    clearHtmlTimeouts();
    abortServerTTS();
    resolvePendingPlayback();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    cleanupHtmlAudio();
    if (isAndroidNativeAudioAvailable()) {
      await cleanupNativeAudio();
    }

    if (mountedRef.current) {
      setIsSpeaking(false);
    }
  }, [
    abortServerTTS,
    cleanupHtmlAudio,
    cleanupNativeAudio,
    clearHtmlTimeouts,
    resolvePendingPlayback,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void stopAllAudio();
    };
  }, [stopAllAudio]);

  const ensureNativeConfigured = useCallback(() => {
    if (!nativeConfiguredRef.current) {
      nativeConfiguredRef.current = NativeAudio.configure({
        fade: false,
        focus: true,
      }).catch(() => {});
    }
    return nativeConfiguredRef.current;
  }, []);

  const speakWithServerTTS = useCallback(async (
    text: string,
    ttsLang: string,
    token: number
  ): Promise<void> => {
    const abortController = new AbortController();
    ttsAbortRef.current = abortController;

    try {
      const response = await apiFetch('/api/tts', {
        method: 'POST',
        body: JSON.stringify({ text, lang: ttsLang.startsWith('ja') ? 'ja' : 'en' }),
        signal: abortController.signal,
      });

      if (abortController.signal.aborted || currentTokenRef.current !== token) return;
      if (!response.ok) return;

      const blob = await response.blob();
      if (abortController.signal.aborted || currentTokenRef.current !== token) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      htmlAudioRef.current = audio;

      await new Promise<void>((resolve) => {
        const cleanup = () => {
          URL.revokeObjectURL(url);
          cleanupHtmlAudio(audio);
          if (currentTokenRef.current === token && mountedRef.current) {
            setIsSpeaking(false);
          }
          resolve();
        };

        audio.onended = cleanup;
        audio.onerror = cleanup;

        if (currentTokenRef.current !== token) {
          cleanup();
          return;
        }

        audio.play().catch(cleanup);
      });
    } catch (err: any) {
      if (err?.name !== 'AbortError' && currentTokenRef.current === token && mountedRef.current) {
        setIsSpeaking(false);
      }
    } finally {
      if (ttsAbortRef.current === abortController) {
        ttsAbortRef.current = null;
      }
    }
  }, [cleanupHtmlAudio]);

  const speakWithNativeAudio = useCallback(async (
    sentenceId: string,
    audioLang: AudioLang,
    token: number,
    fallbackText?: string
  ): Promise<void> => {
    await stopAllAudio();
    currentTokenRef.current = token;
    if (currentTokenRef.current !== token) return;

    if (mountedRef.current) {
      setIsSpeaking(true);
    }

    await ensureNativeConfigured();
    if (currentTokenRef.current !== token) return;

    const assetId = getNativeAssetId(audioLang, sentenceId);
    const assetPath = getNativeAssetPath(audioLang, sentenceId);
    nativeAssetIdRef.current = assetId;

    try {
      await NativeAudio.preload({
        assetId,
        assetPath,
        audioChannelNum: 1,
        isUrl: false,
        volume: 1,
      });
    } catch {
      nativeAssetIdRef.current = null;
      if (fallbackText) {
        const ttsLang = audioLang === 'ja' ? 'ja-JP' : 'en-US';
        await speakWithServerTTS(fallbackText, ttsLang, token);
      } else if (mountedRef.current) {
        setIsSpeaking(false);
      }
      return;
    }

    if (currentTokenRef.current !== token) {
      await cleanupNativeAudio();
      return;
    }

    await new Promise<void>(async (resolve) => {
      pendingResolveRef.current = resolve;

      nativeCompleteListenerRef.current = await NativeAudio.addListener('complete', async (event) => {
        if (event.assetId !== assetId || currentTokenRef.current !== token) return;
        await cleanupNativeAudio();
        if (mountedRef.current) {
          setIsSpeaking(false);
        }
        if (pendingResolveRef.current === resolve) {
          pendingResolveRef.current = null;
        }
        resolve();
      });

      if (currentTokenRef.current !== token) {
        await cleanupNativeAudio();
        resolve();
        return;
      }

      await NativeAudio.play({ assetId, time: 0 }).catch(async () => {
        await cleanupNativeAudio();
        if (fallbackText) {
          const ttsLang = audioLang === 'ja' ? 'ja-JP' : 'en-US';
          await speakWithServerTTS(fallbackText, ttsLang, token);
        } else if (mountedRef.current) {
          setIsSpeaking(false);
        }
        if (pendingResolveRef.current === resolve) {
          pendingResolveRef.current = null;
        }
        resolve();
      });
    });
  }, [cleanupNativeAudio, ensureNativeConfigured, speakWithServerTTS, stopAllAudio]);

  const speakWithHtmlAudio = useCallback(async (
    sentenceId: string,
    audioLang: AudioLang,
    token: number,
    fallbackText?: string,
    playbackRate?: number
  ): Promise<void> => {
    await stopAllAudio();
    currentTokenRef.current = token;
    if (currentTokenRef.current !== token) return;

    if (mountedRef.current) {
      setIsSpeaking(true);
    }

    const audioPath = `/audio/${audioLang}/${sentenceId}.mp3`;
    const ttsLang = audioLang === 'ja' ? 'ja-JP' : 'en-US';
    const audio = new Audio(audioPath);
    htmlAudioRef.current = audio;

    if (typeof playbackRate === 'number') {
      audio.playbackRate = playbackRate;
      audio.defaultPlaybackRate = playbackRate;
    }
    audio.preload = 'auto';

    await new Promise<void>((resolve) => {
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

      const finish = () => {
        clearHtmlTimeouts();
        cleanupHtmlAudio(audio);
        if (currentTokenRef.current === token && mountedRef.current) {
          setIsSpeaking(false);
        }
        safeResolve();
      };

      htmlSafetyTimeoutRef.current = setTimeout(finish, 15000);
      audio.onended = finish;
      audio.onerror = async () => {
        clearHtmlTimeouts();
        cleanupHtmlAudio(audio);
        if (fallbackText && currentTokenRef.current === token) {
          await speakWithServerTTS(fallbackText, ttsLang, token);
        } else if (currentTokenRef.current === token && mountedRef.current) {
          setIsSpeaking(false);
        }
        safeResolve();
      };

      const startPlayback = async () => {
        if (started) return;
        started = true;
        if (currentTokenRef.current !== token) {
          finish();
          return;
        }
        try {
          audio.currentTime = 0;
        } catch { /* ignore */ }

        audio.play().catch(async () => {
          clearHtmlTimeouts();
          cleanupHtmlAudio(audio);
          if (fallbackText && currentTokenRef.current === token) {
            await speakWithServerTTS(fallbackText, ttsLang, token);
          } else if (currentTokenRef.current === token && mountedRef.current) {
            setIsSpeaking(false);
          }
          safeResolve();
        });
      };

      if (audio.readyState >= 3) {
        void startPlayback();
      } else {
        audio.addEventListener('canplaythrough', startPlayback, { once: true });
        htmlLoadTimeoutRef.current = setTimeout(() => {
          htmlLoadTimeoutRef.current = null;
          if (started || currentTokenRef.current !== token) return;
          if (audio.readyState >= 2) {
            void startPlayback();
          } else {
            audio.onerror?.(new Event('error'));
          }
        }, 3000);
      }
    });
  }, [cleanupHtmlAudio, clearHtmlTimeouts, speakWithServerTTS, stopAllAudio]);

  const speak = useCallback(
    async (
      sentenceId: string,
      customLang?: AudioLang,
      playToken?: number,
      fallbackText?: string,
      playbackRate?: number
    ): Promise<void> => {
      if (!sentenceId) return;

      const token = playToken ?? ++tokenCounterRef.current;
      const audioLang = customLang || lang;
      const canUseNativeAudio =
        isAndroidNativeAudioAvailable() &&
        (typeof playbackRate !== 'number' || playbackRate === 1);

      if (canUseNativeAudio) {
        await speakWithNativeAudio(sentenceId, audioLang, token, fallbackText);
      } else {
        await speakWithHtmlAudio(sentenceId, audioLang, token, fallbackText, playbackRate);
      }
    },
    [lang, speakWithHtmlAudio, speakWithNativeAudio]
  );

  const speakText = useCallback(
    async (_text: string, _customLang?: AudioLang, _playToken?: number): Promise<void> => {
      console.warn('speakText is deprecated, use speak with sentenceId instead');
    },
    []
  );

  const stop = useCallback(() => {
    return stopAllAudio();
  }, [stopAllAudio]);

  return {
    speak,
    speakText,
    stop,
    isSpeaking,
  };
}
