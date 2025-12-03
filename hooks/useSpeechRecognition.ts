import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionOptions {
  lang?: string;
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const { lang = 'en-US' } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // ブラウザがWeb Speech APIをサポートしているか確認
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // 連続モードに変更
      recognitionRef.current.interimResults = true; // 中間結果を取得
      recognitionRef.current.lang = lang;
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (finalText) {
          setTranscript((prev) => prev + finalText);
        }
        setInterimTranscript(interimText);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [lang]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;

    setTranscript('');
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Failed to stop recognition:', error);
    }
  }, [isSupported]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
