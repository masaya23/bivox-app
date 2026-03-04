'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiFetch } from '@/utils/api';

/**
 * Whisper APIを使った高精度音声認識フック
 * MediaRecorderで録音 → サーバーのWhisper APIで文字起こし
 */

type StartOptions = {
  /** 期待される英文（Whisperのpromptヒントに使用） */
  expectedText?: string;
  /** 無音で自動停止するまでの秒数（デフォルト: 2） */
  silenceTimeout?: number;
  /** 発話なしタイムアウト秒数（デフォルト: 8） */
  noSpeechTimeout?: number;
  /** 文字起こし完了時のコールバック（テキスト） */
  onResult?: (text: string) => void;
  /** 発話なし時のコールバック */
  onNoSpeech?: () => void;
  /** エラー時のコールバック */
  onError?: (msg: string) => void;
};

export function useWhisperRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const noSpeechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const optionsRef = useRef<StartOptions>({});
  const hasSpeechRef = useRef(false);
  const isListeningRef = useRef(false);
  /** cancel() で停止した場合に文字起こしをスキップするフラグ */
  const cancelledRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopListening();
    };
  }, []);

  /** 録音した音声をWhisper APIに送信して文字起こし */
  const transcribe = useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', 'en');
    formData.append('temperature', '0');
    // Whisper prompt: 一般的なコンテキストのみ（正解文を含めるとWhisperが補完しすぎる）
    formData.append('prompt', 'English speaking practice. Short sentences.');

    const response = await apiFetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Transcription failed');
    const data = await response.json();
    return data.text || '';
  }, []);

  /** リソースの解放 */
  const releaseResources = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch { /* ignore */ }
    }
    audioContextRef.current = null;
  }, []);

  /** 録音を停止（→ onstopで文字起こし開始） */
  const stopListening = useCallback(() => {
    if (!isListeningRef.current && !mediaRecorderRef.current) return;
    isListeningRef.current = false;
    // タイマー・AnimationFrameだけ先にクリア（ストリームはまだ止めない）
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }
    // MediaRecorderを先に停止 → onstopでデータ処理後にストリーム解放
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    } else {
      // recorderが無い or 既にinactiveならリソース解放
      releaseResources();
    }
  }, [releaseResources]);

  /** 録音を中断（文字起こしなしで停止） */
  const cancelListening = useCallback(() => {
    if (!isListeningRef.current && !mediaRecorderRef.current) return;
    cancelledRef.current = true;
    stopListening();
  }, [stopListening]);

  /** 録音を開始 */
  const startListening = useCallback(async (options: StartOptions = {}) => {
    if (isListeningRef.current) return;

    optionsRef.current = options;
    audioChunksRef.current = [];
    hasSpeechRef.current = false;
    cancelledRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // AudioContext + AnalyserNode for silence detection
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // recorder停止後にストリーム・AudioContextを解放
        releaseResources();

        if (!mountedRef.current) return;

        // cancel() で停止された場合は文字起こしをスキップ
        if (cancelledRef.current) {
          cancelledRef.current = false;
          if (mountedRef.current) setIsListening(false);
          return;
        }

        const chunks = audioChunksRef.current;
        const opts = optionsRef.current;

        if (chunks.length === 0 || !hasSpeechRef.current) {
          if (mountedRef.current) {
            setIsListening(false);
            opts.onNoSpeech?.();
          }
          return;
        }

        const audioBlob = new Blob(chunks, { type: mimeType });

        if (mountedRef.current) setIsTranscribing(true);
        try {
          const text = await transcribe(audioBlob);
          if (mountedRef.current) {
            setIsTranscribing(false);
            setIsListening(false);
            if (text) {
              opts.onResult?.(text);
            } else {
              opts.onNoSpeech?.();
            }
          }
        } catch (err) {
          console.error('[Whisper] Transcription error:', err);
          if (mountedRef.current) {
            setIsTranscribing(false);
            setIsListening(false);
            opts.onError?.('文字起こしに失敗しました');
          }
        }
      };

      recorder.start(1000);
      isListeningRef.current = true;
      if (mountedRef.current) setIsListening(true);

      // 無音検知
      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      const silenceThreshold = 3;
      const silenceMs = (options.silenceTimeout || 2) * 1000;

      const checkSilence = () => {
        if (!isListeningRef.current) return;
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i] - 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / bufferLength);

        if (rms > silenceThreshold) {
          hasSpeechRef.current = true;
          if (noSpeechTimerRef.current) {
            clearTimeout(noSpeechTimerRef.current);
            noSpeechTimerRef.current = null;
          }
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            stopListening();
          }, silenceMs);
        }
        animationFrameRef.current = requestAnimationFrame(checkSilence);
      };
      animationFrameRef.current = requestAnimationFrame(checkSilence);

      // 発話なしタイムアウト
      const noSpeechMs = (options.noSpeechTimeout || 8) * 1000;
      noSpeechTimerRef.current = setTimeout(() => {
        if (!hasSpeechRef.current && isListeningRef.current) {
          stopListening();
        }
      }, noSpeechMs);

    } catch (err) {
      console.error('[Whisper] startListening error:', err);
      if (mountedRef.current) {
        setIsListening(false);
        isListeningRef.current = false;
        options.onError?.('マイクの許可が必要です');
      }
    }
  }, [transcribe, stopListening]);

  return {
    isListening,
    isTranscribing,
    startListening,
    stopListening,
    /** 文字起こしなしで録音を中断 */
    cancelListening,
  };
}
