"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSpeechRecognition } from "@/lib/voice/use-speech-recognition";
import { useSpeechSynthesis } from "@/lib/voice/use-speech-synthesis";
import type { VoiceState } from "@/lib/voice/voice-manager";

type ExtendedVoiceState = VoiceState | "TRANSCRIBING";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  isProcessing: boolean;
  lastAssistantMessage?: string;
}

export function VoiceButton({
  onTranscript,
  isProcessing,
  lastAssistantMessage,
}: VoiceButtonProps) {
  const {
    isListening,
    isTranscribing,
    transcript,
    isSupported: sttSupported,
    error,
    start,
    stop,
  } = useSpeechRecognition();
  const { isSpeaking, isSupported: ttsSupported, speak, cancel } =
    useSpeechSynthesis();

  const [voiceState, setVoiceState] = useState<ExtendedVoiceState>("IDLE");
  const [lastSpoken, setLastSpoken] = useState<string>("");

  // Auto-clear errors after 4 seconds
  const [displayError, setDisplayError] = useState<string | null>(null);
  useEffect(() => {
    if (error) {
      setDisplayError(error);
      const timer = setTimeout(() => setDisplayError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Derive voice state from the constituent states
  useEffect(() => {
    if (isSpeaking) {
      setVoiceState("SPEAKING");
    } else if (isProcessing) {
      setVoiceState("PROCESSING");
    } else if (isTranscribing) {
      setVoiceState("TRANSCRIBING");
    } else if (isListening) {
      setVoiceState("LISTENING");
    } else {
      setVoiceState("IDLE");
    }
  }, [isListening, isTranscribing, isProcessing, isSpeaking]);

  // When transcription completes and we have a transcript, submit it (once)
  const submittedTranscriptRef = useRef<string>("");
  useEffect(() => {
    if (
      !isListening &&
      !isTranscribing &&
      transcript.trim() &&
      transcript !== submittedTranscriptRef.current
    ) {
      submittedTranscriptRef.current = transcript;
      onTranscript(transcript);
    }
  }, [isListening, isTranscribing, transcript, onTranscript]);

  // Auto-speak new assistant messages
  useEffect(() => {
    if (
      ttsSupported &&
      lastAssistantMessage &&
      lastAssistantMessage !== lastSpoken &&
      !isProcessing
    ) {
      setLastSpoken(lastAssistantMessage);
      speak(lastAssistantMessage);
    }
  }, [lastAssistantMessage, isProcessing, ttsSupported, speak, lastSpoken]);

  const handlePress = useCallback(async () => {
    switch (voiceState) {
      case "IDLE":
        submittedTranscriptRef.current = "";
        await start();
        break;
      case "LISTENING":
        stop();
        break;
      case "SPEAKING":
        cancel();
        break;
      case "PROCESSING":
      case "TRANSCRIBING":
        // Nothing to do while processing
        break;
    }
  }, [voiceState, start, stop, cancel]);

  if (!sttSupported) {
    return (
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-60"
        title="Voice not supported on this browser"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      </div>
    );
  }

  const stateConfig: Record<
    ExtendedVoiceState,
    { icon: React.ReactNode; label: string; className: string }
  > = {
    IDLE: {
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      ),
      label: "Tap to speak",
      className: "bg-primary text-white hover:bg-primary-light",
    },
    LISTENING: {
      icon: (
        <div className="flex items-center gap-0.5">
          <span className="inline-block h-4 w-1 animate-pulse rounded-full bg-white" />
          <span className="inline-block h-6 w-1 animate-pulse rounded-full bg-white [animation-delay:100ms]" />
          <span className="inline-block h-3 w-1 animate-pulse rounded-full bg-white [animation-delay:200ms]" />
          <span className="inline-block h-5 w-1 animate-pulse rounded-full bg-white [animation-delay:300ms]" />
          <span className="inline-block h-4 w-1 animate-pulse rounded-full bg-white [animation-delay:100ms]" />
        </div>
      ),
      label: "Listening... tap to stop",
      className: "bg-red-500 text-white voice-pulse",
    },
    TRANSCRIBING: {
      icon: (
        <svg
          className="animate-spin"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ),
      label: "Transcribing...",
      className: "bg-amber-500 text-white",
    },
    PROCESSING: {
      icon: (
        <svg
          className="animate-spin"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ),
      label: "Thinking...",
      className: "bg-muted text-foreground",
    },
    SPEAKING: {
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ),
      label: "Speaking... tap to stop",
      className: "bg-green-500 text-white voice-pulse",
    },
  };

  const config = stateConfig[voiceState];

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handlePress}
        disabled={voiceState === "PROCESSING" || voiceState === "TRANSCRIBING"}
        className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all disabled:opacity-60 ${config.className}`}
        aria-label={config.label}
        title={config.label}
      >
        {config.icon}
      </button>
      {displayError && (
        <p className="max-w-48 text-center text-xs text-red-500">
          {displayError}
        </p>
      )}
    </div>
  );
}
