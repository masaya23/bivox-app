import { useState, useCallback, useRef } from 'react';

interface OpenAITTSOptions {
  lang?: 'ja' | 'en';
}

export function useOpenAITTS(options: OpenAITTSOptions = {}) {
  const { lang = 'en' } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(
    async (text: string, customLang?: 'ja' | 'en') => {
      if (!text) return;

      // 既に再生中の場合は停止
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setIsSpeaking(true);

      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            lang: customLang || lang,
          }),
        });

        if (!response.ok) {
          throw new Error('TTS生成に失敗しました');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } catch (error) {
        console.error('TTS再生エラー:', error);
        setIsSpeaking(false);
      }
    },
    [lang]
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
  };
}
