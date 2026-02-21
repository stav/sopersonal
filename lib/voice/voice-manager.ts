export type VoiceState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING";

export interface VoiceTransition {
  from: VoiceState;
  to: VoiceState;
  action: string;
}

const VALID_TRANSITIONS: VoiceTransition[] = [
  { from: "IDLE", to: "LISTENING", action: "startListening" },
  { from: "LISTENING", to: "PROCESSING", action: "submitTranscript" },
  { from: "LISTENING", to: "IDLE", action: "cancelListening" },
  { from: "PROCESSING", to: "SPEAKING", action: "startSpeaking" },
  { from: "PROCESSING", to: "IDLE", action: "responseComplete" },
  { from: "SPEAKING", to: "IDLE", action: "doneSpeaking" },
  { from: "SPEAKING", to: "LISTENING", action: "startListening" },
];

export function canTransition(from: VoiceState, to: VoiceState): boolean {
  return VALID_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function getNextState(
  current: VoiceState,
  action: string
): VoiceState | null {
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === current && t.action === action
  );
  return transition?.to ?? null;
}
