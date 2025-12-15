import { useState, useEffect, useCallback, useRef } from 'react';

interface TTSOptions {
  autoPlay?: boolean; // 答え表示時に自動再生
  rate?: number; // 速度 (0.5 - 2.0)
}

// テキストから言語を判定
function detectLanguage(text: string): string {
  // 日本語文字（ひらがな、カタカナ、漢字）が含まれているかチェック
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  return hasJapanese ? 'ja-JP' : 'en-US';
}

// 指定された言語に最適な音声を選択
function selectVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();

  if (lang === 'ja-JP') {
    // 日本語音声を優先順位で選択
    // 1. Google日本語（高品質）
    const googleJa = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google'));
    if (googleJa) return googleJa;

    // 2. その他のja-JP音声
    const jaVoice = voices.find(v => v.lang === 'ja-JP');
    if (jaVoice) return jaVoice;
  } else {
    // 英語音声を優先順位で選択
    // 1. Google US English（高品質）
    const googleEn = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
    if (googleEn) return googleEn;

    // 2. その他のen-US音声
    const enVoice = voices.find(v => v.lang === 'en-US');
    if (enVoice) return enVoice;

    // 3. 任意の英語音声
    const anyEnVoice = voices.find(v => v.lang.startsWith('en-'));
    if (anyEnVoice) return anyEnVoice;
  }

  return null;
}

let globalRunId = 0;
const cancelSubscribers = new Set<() => void>();

function globalCancel(): number {
  globalRunId += 1;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }

  for (const subscriber of cancelSubscribers) {
    try {
      subscriber();
    } catch {
      // ignore
    }
  }

  return globalRunId;
}

export function useTTS(options: TTSOptions = {}) {
  const { autoPlay = false, rate = 1.0 } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [currentRate, setCurrentRate] = useState(rate);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const pendingTimeoutRef = useRef<number | null>(null);
  const localRunIdRef = useRef(0);
  const activeResolveRef = useRef<(() => void) | null>(null);
  const activeRejectRef = useRef<((err: any) => void) | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    // ブラウザがWeb Speech APIをサポートしているか確認
    setIsSupported('speechSynthesis' in window);

    if ('speechSynthesis' in window) {
      // 音声リストの読み込みを待つ
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoicesLoaded(true);
        }
      };

      // 音声リストが既に読み込まれている場合
      loadVoices();

      // 音声リストの読み込みを監視
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    const cancelLocal = () => {
      if (pendingTimeoutRef.current !== null) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }

      localRunIdRef.current = globalRunId;

      const resolve = activeResolveRef.current;
      activeResolveRef.current = null;
      activeRejectRef.current = null;

      if (mountedRef.current) {
        setIsSpeaking(false);
      }

      // 再生キャンセル時は「完了扱い」で抜ける（待機中のawaitが止まらないのを防ぐ）
      resolve?.();
    };

    cancelSubscribers.add(cancelLocal);

    return () => {
      mountedRef.current = false;
      cancelSubscribers.delete(cancelLocal);
      cancelLocal();
    };
  }, []);

  const speak = useCallback(
    (text: string, customRate?: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!isSupported || !text) {
          reject(new Error('TTS not supported or no text'));
          return;
        }

        // 既存の再生/予約をすべてキャンセル（他のuseTTSインスタンス含む）
        const runId = globalCancel();
        localRunIdRef.current = runId;

        let settled = false;
        const resolveOnce = () => {
          if (settled) return;
          settled = true;
          activeResolveRef.current = null;
          activeRejectRef.current = null;
          if (mountedRef.current) setIsSpeaking(false);
          resolve();
        };
        const rejectOnce = (err: any) => {
          if (settled) return;
          settled = true;
          activeResolveRef.current = null;
          activeRejectRef.current = null;
          if (mountedRef.current) setIsSpeaking(false);
          reject(err);
        };

        activeResolveRef.current = resolveOnce;
        activeRejectRef.current = rejectOnce;

        // 音声リストの読み込みを待つ
        const speakWithVoice = () => {
          if (localRunIdRef.current !== runId || globalRunId !== runId) return;
          const utterance = new SpeechSynthesisUtterance(text);

          // テキストから言語を自動判定
          const detectedLang = detectLanguage(text);
          utterance.lang = detectedLang;

          // 最適な音声を選択
          const voice = selectVoice(detectedLang);
          if (voice) {
            utterance.voice = voice;
          }

          utterance.rate = customRate || currentRate;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onstart = () => {
            if (localRunIdRef.current !== runId || globalRunId !== runId) return;
            setIsSpeaking(true);
          };
          utterance.onend = () => {
            if (localRunIdRef.current !== runId || globalRunId !== runId) return;
            resolveOnce();
          };
          utterance.onerror = (event) => {
            if (localRunIdRef.current !== runId || globalRunId !== runId) return;
            console.error('TTS Error:', event);
            rejectOnce(event);
          };

          window.speechSynthesis.speak(utterance);
        };

        // 音声がロードされていれば即座に再生、されていなければ少し待つ
        if (voicesLoaded) {
          speakWithVoice();
        } else {
          // 音声リストのロードを待つ
          pendingTimeoutRef.current = window.setTimeout(speakWithVoice, 100);
        }
      });
    },
    [isSupported, currentRate, voicesLoaded]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    globalCancel();
    if (mountedRef.current) setIsSpeaking(false);
  }, [isSupported]);

  const changeRate = useCallback((newRate: number) => {
    setCurrentRate(newRate);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    currentRate,
    changeRate,
  };
}
