import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Send, Volume2 } from 'lucide-react';
import type { ItemAnalysis, OutfitOption } from '../types/stylist';
import {
  AVAILABLE_STYLIST_VOICES,
  base64ToFloat32Pcm,
  buildStylistLiveContextSummary,
  float32ToInt16Pcm,
  getLiveWebSocketUrl,
  int16PcmToBase64,
  type StylistVoiceName,
} from '../utils/liveAudio';

interface TranscriptTurn {
  id: string;
  speaker: 'you' | 'stylist';
  text: string;
}

interface VoiceStylistSectionProps {
  analysis: ItemAnalysis | null;
  outfits: OutfitOption[];
  preferredVoice: StylistVoiceName;
  onVoiceChange: (voice: StylistVoiceName) => void;
  onVoiceSessionEnded?: (summary: {
    anchorItemName: string;
    voiceName: StylistVoiceName;
    transcriptSummary: string;
    durationSeconds: number;
  }) => void;
}

const STARTER_QUESTIONS = [
  'Which shoes work best with this piece?',
  'How can I dress the Business look down slightly?',
  'What jewelry metals flatter this palette?',
];

export function VoiceStylistSection({
  analysis,
  outfits,
  preferredVoice,
  onVoiceChange,
  onVoiceSessionEnded,
}: VoiceStylistSectionProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isStylistSpeaking, setIsStylistSpeaking] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typedPrompt, setTypedPrompt] = useState('');
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isMutedRef = useRef<boolean>(false);
  const sessionStartMsRef = useRef<number>(0);
  const turnsRef = useRef<TranscriptTurn[]>([]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const stopPlaybackQueue = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsStylistSpeaking(false);
  }, []);

  const cleanupResources = useCallback(
    (notifyEnded: boolean) => {
      if (processorRef.current) {
        processorRef.current.onaudioprocess = null;
        try {
          processorRef.current.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        processorRef.current = null;
      }

      if (micStreamRef.current) {
        for (const track of micStreamRef.current.getTracks()) {
          track.stop();
        }
        micStreamRef.current = null;
      }

      if (inputAudioCtxRef.current) {
        void inputAudioCtxRef.current.close().catch(() => {});
        inputAudioCtxRef.current = null;
      }

      stopPlaybackQueue();

      if (outputAudioCtxRef.current) {
        void outputAudioCtxRef.current.close().catch(() => {});
        outputAudioCtxRef.current = null;
      }

      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop' }));
          }
          wsRef.current.close();
        } catch {
          // Ignore close errors
        }
        wsRef.current = null;
      }

      if (notifyEnded && sessionStartMsRef.current > 0) {
        const durationSeconds = Math.max(
          1,
          Math.round((Date.now() - sessionStartMsRef.current) / 1000),
        );
        sessionStartMsRef.current = 0;
        const summary = turnsRef.current
          .slice(-8)
          .map((t) => `${t.speaker === 'you' ? 'Client' : 'Stylist'}: ${t.text}`)
          .join(' | ');
        if (onVoiceSessionEnded && summary) {
          onVoiceSessionEnded({
            anchorItemName: analysis?.itemName ?? 'Wardrobe Consultation',
            voiceName: preferredVoice,
            transcriptSummary: summary,
            durationSeconds,
          });
        }
      }
    },
    [analysis?.itemName, onVoiceSessionEnded, preferredVoice, stopPlaybackQueue],
  );

  useEffect(() => {
    return () => {
      cleanupResources(false);
    };
  }, [cleanupResources]);

  const appendTranscriptChunk = useCallback(
    (speaker: 'you' | 'stylist', chunk: string) => {
      const cleaned = chunk.trim();
      if (!cleaned) return;
      setTurns((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.speaker === speaker) {
          const needsSpace = !last.text.endsWith(' ') && !cleaned.startsWith(' ');
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              text: `${last.text}${needsSpace ? ' ' : ''}${cleaned}`,
            },
          ];
        }
        return [
          ...prev,
          {
            id: `${speaker}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            speaker,
            text: cleaned,
          },
        ];
      });
    },
    [],
  );

  const playPcm24Chunk = useCallback((base64Data: string) => {
    const outCtx = outputAudioCtxRef.current;
    if (!outCtx) return;

    const samples = base64ToFloat32Pcm(base64Data);
    if (samples.length === 0) return;

    const audioBuffer = outCtx.createBuffer(1, samples.length, 24000);
    audioBuffer.copyToChannel(new Float32Array(samples), 0);

    const source = outCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outCtx.destination);

    const startAt = Math.max(outCtx.currentTime, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + audioBuffer.duration;
    setIsStylistSpeaking(true);

    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) {
        setIsStylistSpeaking(false);
      }
    };
  }, []);

  const handleStartSession = async () => {
    if (status === 'connecting' || status === 'live') return;
    setErrorMessage(null);
    setStatus('connecting');
    setTurns([]);
    sessionStartMsRef.current = Date.now();

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      await outputCtx.resume().catch(() => {});
      outputAudioCtxRef.current = outputCtx;

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        setMicAvailable(true);
      } catch {
        setMicAvailable(false);
      }

      const ws = new WebSocket(getLiveWebSocketUrl(window.location));
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'start',
            voiceName: preferredVoice,
            contextSummary: buildStylistLiveContextSummary(analysis, outfits),
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type?: string;
            data?: string;
            text?: string;
            message?: string;
          };

          if (msg.type === 'ready') {
            setStatus('live');
            if (stream && !inputAudioCtxRef.current) {
              const inputCtx = new AudioCtx({ sampleRate: 16000 });
              void inputCtx.resume().catch(() => {});
              inputAudioCtxRef.current = inputCtx;
              const source = inputCtx.createMediaStreamSource(stream);
              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (ev) => {
                if (isMutedRef.current) return;
                if (ws.readyState !== WebSocket.OPEN) return;
                const pcm16 = float32ToInt16Pcm(ev.inputBuffer.getChannelData(0));
                const base64 = int16PcmToBase64(pcm16);
                ws.send(JSON.stringify({ type: 'audio', data: base64 }));
              };

              source.connect(processor);
              processor.connect(inputCtx.destination);
            }
          } else if (msg.type === 'audio' && msg.data) {
            playPcm24Chunk(msg.data);
          } else if (msg.type === 'inputTranscript' && msg.text) {
            appendTranscriptChunk('you', msg.text);
          } else if (msg.type === 'outputTranscript' && msg.text) {
            appendTranscriptChunk('stylist', msg.text);
          } else if (msg.type === 'interrupted') {
            stopPlaybackQueue();
          } else if (msg.type === 'error') {
            setErrorMessage(
              msg.message || 'Voice consultation could not stay connected.',
            );
            setStatus('error');
            cleanupResources(false);
          } else if (msg.type === 'closed') {
            setStatus('idle');
            cleanupResources(true);
          }
        } catch {
          // Ignore unparseable messages
        }
      };

      ws.onerror = () => {
        setErrorMessage('Unable to connect to the live voice stylist.');
        setStatus('error');
        cleanupResources(false);
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          setStatus((curr) => (curr === 'error' ? 'error' : 'idle'));
          cleanupResources(true);
        }
      };
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to start voice session.',
      );
      setStatus('error');
      cleanupResources(false);
    }
  };

  const handleEndSession = () => {
    cleanupResources(true);
    setStatus('idle');
  };

  const handleSendTextInSession = (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'text', text: trimmed }));
    appendTranscriptChunk('you', trimmed);
    setTypedPrompt('');
  };

  return (
    <section
      id="voice-stylist"
      aria-label="Live voice stylist consultation"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 sm:py-12 border-b border-[#E4E4E7]"
    >
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-5 flex flex-col justify-between gap-5 sm:gap-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-[#575652]">
              Live Voice Consultation · gemini-3.8-live
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#141413] tracking-tight">
              Speak with Your Stylist
            </h2>
            <p className="text-sm text-[#575652] leading-relaxed">
              Ask real-time styling questions about proportions, shoe pairings, tailoring,
              or jewelry while viewing{' '}
              <span className="font-medium text-[#141413]">
                {analysis?.itemName ?? 'your wardrobe piece'}
              </span>
              .
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="voice-persona-select"
                className="block text-xs font-medium text-[#575652] mb-1.5"
              >
                Stylist Voice
              </label>
              <select
                id="voice-persona-select"
                value={preferredVoice}
                disabled={status === 'live' || status === 'connecting'}
                onChange={(e) => onVoiceChange(e.target.value as StylistVoiceName)}
                className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-[#F8F8F7] border border-[#E4E4E7] rounded-lg text-[#141413] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#141413]"
              >
                {AVAILABLE_STYLIST_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {v.tone}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
              {status === 'live' || status === 'connecting' ? (
                <>
                  <button
                    type="button"
                    onClick={handleEndSession}
                    className="w-full sm:w-auto min-h-12 sm:min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#9E1B32] rounded-lg hover:bg-[#821528] transition-colors cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" aria-hidden="true" />
                    End Voice Session
                  </button>
                  {micAvailable && (
                    <button
                      type="button"
                      onClick={() => setIsMuted((m) => !m)}
                      aria-pressed={isMuted}
                      className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-[#141413] bg-[#F8F8F7] border border-[#E4E4E7] rounded-lg hover:bg-[#EFEFEF] transition-colors cursor-pointer"
                    >
                      {isMuted ? (
                        <>
                          <MicOff className="w-4 h-4" aria-hidden="true" />
                          Unmute Mic
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" aria-hidden="true" />
                          Mute Mic
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartSession}
                  className="w-full sm:w-auto min-h-12 sm:min-h-11 inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 text-sm sm:text-xs font-semibold text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141413]"
                >
                  <Mic className="w-4 h-4" aria-hidden="true" />
                  Start Voice Consultation
                </button>
              )}
            </div>

            {!micAvailable && status === 'live' && (
              <p className="text-xs text-[#575652]">
                Microphone access is unavailable—type a question on the right to hear spoken
                responses.
              </p>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="text-xs text-[#9E1B32] bg-[#FAF3F4] border border-[#E7C6CC] rounded-lg px-3 py-2"
              >
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col bg-[#F8F8F7] border border-[#E4E4E7] rounded-xl p-4 sm:p-5 min-h-[260px] sm:min-h-[300px] justify-between gap-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E4E4E7]">
            <span className="text-xs font-semibold text-[#141413]">
              Live Conversation Transcript
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#575652]">
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              {status === 'connecting'
                ? 'Connecting...'
                : status === 'live'
                  ? isStylistSpeaking
                    ? 'Stylist speaking'
                    : isMuted
                      ? 'Mic muted'
                      : 'Listening'
                  : 'Ready to connect'}
            </span>
          </div>

          <div
            aria-live="polite"
            className="flex-1 max-h-56 overflow-y-auto space-y-3 pr-1 text-sm"
          >
            {turns.length === 0 ? (
              <div className="py-6 sm:py-8 text-center space-y-2">
                <p className="font-display text-xl text-[#141413]">
                  {status === 'live'
                    ? 'Say hello or ask about any look above'
                    : 'Real-Time Styling Dialogue'}
                </p>
                <p className="text-xs text-[#575652] max-w-md mx-auto">
                  Discuss color substitutions, hem proportions, footwear swaps, or packing
                  options tailored to your current anchor garment.
                </p>
              </div>
            ) : (
              turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex flex-col gap-0.5 ${
                    turn.speaker === 'you' ? 'items-end' : 'items-start'
                  }`}
                >
                  <span className="text-[11px] font-medium text-[#575652]">
                    {turn.speaker === 'you' ? 'You' : 'Atelier Stylist'}
                  </span>
                  <p
                    className={`max-w-[85%] px-3.5 py-2 rounded-xl text-xs leading-relaxed ${
                      turn.speaker === 'you'
                        ? 'bg-[#141413] text-white'
                        : 'bg-white border border-[#E4E4E7] text-[#141413]'
                    }`}
                  >
                    {turn.text}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2.5 pt-2 border-t border-[#E4E4E7]">
            <div className="flex flex-wrap gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={status !== 'live'}
                  onClick={() => handleSendTextInSession(q)}
                  className="text-xs sm:text-[11px] text-left font-medium text-[#575652] hover:text-[#141413] bg-white border border-[#E4E4E7] rounded-lg sm:rounded-md min-h-10 sm:min-h-0 px-3 sm:px-2.5 py-2 sm:py-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTextInSession(typedPrompt);
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="voice-text-followup" className="sr-only">
                Send a typed styling question during voice session
              </label>
              <input
                id="voice-text-followup"
                type="text"
                value={typedPrompt}
                disabled={status !== 'live'}
                onChange={(e) => setTypedPrompt(e.target.value)}
                placeholder={
                  status === 'live'
                    ? 'Ask a follow-up question...'
                    : 'Start a voice session above to speak or type here'
                }
                className="flex-1 min-w-0 h-11 sm:h-10 px-3 text-base sm:text-xs bg-white border border-[#E4E4E7] rounded-lg text-[#141413] placeholder:text-[#575652]/70 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#141413]"
              />
              <button
                type="submit"
                disabled={status !== 'live' || !typedPrompt.trim()}
                aria-label="Send message to live stylist"
                className="inline-flex items-center justify-center gap-1.5 h-11 sm:h-10 px-4 sm:px-3.5 text-xs font-medium text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
