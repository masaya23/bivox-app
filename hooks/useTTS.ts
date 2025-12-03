import { useState, useEffect, useCallback } from 'react';

interface TTSOptions {
  autoPlay?: boolean; // 答え表示時に自動再生
  rate?: number; // 速度 (0.5 - 2.0)
}

export function useTTS(options: TTSOptions = {}) {
  const { autoPlay = false, rate = 1.0 } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [currentRate, setCurrentRate] = useState(rate);

  useEffect(() => {
    // ブラウザがWeb Speech APIをサポートしているか確認
    setIsSupported('speechSynthesis' in window);
  }, []);

  const speak = useCallback(
    (text: string, customRate?: number) => {
      if (!isSupported || !text) return;

      // 既に再生中の場合は停止
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // 英語
      utterance.rate = customRate || currentRate;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, currentRate]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
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
