"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface SpeechRecognitionOptions {
  autoStopOnSilence?: boolean;
}

interface SpeechRecognitionHook {
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

const SILENCE_THRESHOLD = 0.015;
const SILENCE_DURATION = 1500;
const MIN_SPEECH_DURATION = 500;

export function useSpeechRecognition(
  options: SpeechRecognitionOptions = {}
): SpeechRecognitionHook {
  const { autoStopOnSilence = false } = options;

  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Silence detection refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechDetectedRef = useRef(false);
  const speechStartTimeRef = useRef(0);
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef(autoStopOnSilence);

  // Keep ref in sync with prop
  useEffect(() => {
    autoStopRef.current = autoStopOnSilence;
  }, [autoStopOnSilence]);

  useEffect(() => {
    setIsSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia
    );
  }, []);

  const cleanupSilenceDetection = useCallback(() => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    speechDetectedRef.current = false;
    speechStartTimeRef.current = 0;
  }, []);

  const stopRef = useRef<() => void>(() => {});

  const stop = useCallback(() => {
    if (maxDurationRef.current) {
      clearTimeout(maxDurationRef.current);
      maxDurationRef.current = null;
    }
    cleanupSilenceDetection();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setIsListening(false);
  }, [cleanupSilenceDetection]);

  // Keep stopRef in sync
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const setupSilenceDetection = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    speechDetectedRef.current = false;
    speechStartTimeRef.current = 0;

    const dataArray = new Float32Array(analyser.fftSize);

    monitorIntervalRef.current = setInterval(() => {
      if (!analyserRef.current) return;

      analyserRef.current.getFloatTimeDomainData(dataArray);

      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      if (rms > SILENCE_THRESHOLD) {
        // Sound detected
        if (!speechDetectedRef.current) {
          speechDetectedRef.current = true;
          speechStartTimeRef.current = Date.now();
        }
        // Clear any running silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (speechDetectedRef.current) {
        // Silence after speech — start/continue silence timer
        const speechDuration = Date.now() - speechStartTimeRef.current;
        if (speechDuration >= MIN_SPEECH_DURATION && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            stopRef.current();
          }, SILENCE_DURATION);
        }
      }
    }, 100);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setTranscript("");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setError(
          "Microphone permission denied. Check your browser/phone settings."
        );
      } else if (name === "NotFoundError") {
        setError("No microphone found on this device.");
      } else {
        setError("Could not access microphone.");
      }
      return;
    }

    // Pick a supported mime type
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/wav";

    const recorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 16000,
    });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      // Stop all mic tracks
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];

      console.log(`Audio: ${(blob.size / 1024).toFixed(1)}KB, type: ${blob.type}`);

      if (blob.size === 0) {
        setError("No audio recorded.");
        return;
      }

      // Send to Whisper API
      setIsTranscribing(true);
      try {
        const formData = new FormData();
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        formData.append("audio", blob, `recording.${ext}`);

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(data?.error || "Transcription failed.");
          return;
        }

        const { text } = await response.json();
        if (text?.trim()) {
          setTranscript(text.trim());
        } else {
          setError("No speech detected. Try again.");
        }
      } catch {
        setError("Network error. Check your connection.");
      } finally {
        setIsTranscribing(false);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsListening(true);

    // Set up silence detection if enabled
    if (autoStopRef.current) {
      setupSilenceDetection(stream);
    }

    // Auto-stop after 60 seconds
    maxDurationRef.current = setTimeout(() => {
      stopRef.current();
    }, 60000);
  }, [setupSilenceDetection]);

  return {
    isListening,
    isTranscribing,
    transcript,
    isSupported,
    error,
    start,
    stop,
  };
}
