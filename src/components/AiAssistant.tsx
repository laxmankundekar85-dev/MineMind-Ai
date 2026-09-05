import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Chunk, SourceCitation, QueryRecord } from '../types';
import { queryOfflineKnowledgeBase } from '../utils/offlineRAG';
import { sounds } from '../utils/soundEffects';
import { WavAudioRecorder } from '../utils/wavAudioRecorder';
import { 
  Sparkles, 
  Search, 
  Send, 
  BookOpen, 
  ShieldCheck, 
  FileText, 
  Copy, 
  Check, 
  Layers, 
  Building2, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight, 
  History, 
  Bookmark,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Compass,
  WifiOff,
  HardDrive,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Square,
  Globe,
  X,
  RefreshCw,
  Keyboard,
  Lock,
  ShieldAlert,
  Play,
  MessageSquare,
  Zap,
  HelpCircle as HelpIcon
} from 'lucide-react';

const SUBSIDIARY_PRESETS: Record<string, string[]> = {
  ALL: [
    "What is the certified proved reserve and ash percentage for Seam IV/V in Korba Sector C?",
    "What is the liquid nitrogen infusion rate mandated by DGMS for Jharia coalfield fire sealing?",
    "What is the 240T dumper availability and specific diesel consumption in NCL Singrauli projects?",
    "What are the statutory ventilation and methane cutoff standards mandated by DGMS?",
    "Compare slope stability standards between NCL and SECL opencast operations."
  ],
  NCL: [
    "What is the fleet availability and specific diesel consumption for 240T dumpers in Jayant OCP?",
    "What is the total overburden (OB) handled and shovel energy rate across NCL projects in Q1?",
    "Compare HEMM availability and utilization between Jayant and Nigahi opencast projects."
  ],
  SECL: [
    "What is the certified proved reserve and ash percentage for Seam IV/V in Korba Sector C?",
    "What is the overall pit slope angle and factor of safety (FoS) mandated for Gevra OC expansion?",
    "What are the groundwater recharge setback constraints for Korba West opencast block?"
  ],
  BCCL: [
    "What is the liquid nitrogen infusion rate mandated by DGMS for Jharia coalfield fire sealing?",
    "What are the subsurface temperature thresholds and drone survey frequencies for Jharia fire zones?"
  ],
  CCL: [
    "What is the clean coal yield and ash reduction achieved by Piprawar Coal Preparation Plant?",
    "What is the specific magnetite consumption benchmark at Piprawar Washery?"
  ],
  'CMPDI HQ': [
    "What are the statutory ventilation and methane cutoff standards mandated by DGMS?",
    "What is the minimum air quantity and inundation barrier distance mandated by safety guidelines?"
  ]
};

export const AiAssistant: React.FC = () => {
  const { 
    chunks, 
    addQueryRecord, 
    setActiveCitationForModal, 
    selectedSubsidiary, 
    setSelectedSubsidiary,
    similarCases, 
    setReportDraftFromAi, 
    setActiveView,
    setToastMessage,
    isUndergroundModeActive,
    cachedDocumentIds
  } = useApp();

  const [question, setQuestion] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isOfflineResult, setIsOfflineResult] = useState<boolean>(false);
  const [activeResult, setActiveResult] = useState<{
    foundInKnowledgeBase: boolean;
    answer: string;
    aiSummary?: string;
    citations: SourceCitation[];
    confidence: number;
    draftOfficialReply?: string;
  } | null>(null);

  const [showDraftReply, setShowDraftReply] = useState<boolean>(false);
  const [copiedAnswer, setCopiedAnswer] = useState<boolean>(false);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);

  // Typewriter streaming effect state
  const [displayedAnswer, setDisplayedAnswer] = useState<string>('');

  // Voice Interaction States (STT & TTS)
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState<boolean>(false);
  const [autoSpeakAnswer, setAutoSpeakAnswer] = useState<boolean>(false);
  const [speechStatusText, setSpeechStatusText] = useState<string>('');
  const [speechLang, setSpeechLang] = useState<string>('en-IN');
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);
  const [interimSpokenText, setInterimSpokenText] = useState<string>('');
  const [voiceCommandDetected, setVoiceCommandDetected] = useState<string | null>(null);
  const [showVoiceHelp, setShowVoiceHelp] = useState<boolean>(false);

  // Microphone Permissions & Security Context States
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('prompt');
  const [isSecureEnv, setIsSecureEnv] = useState<boolean>(true);
  const [permissionErrorType, setPermissionErrorType] = useState<'denied' | 'insecure_http' | 'unsupported' | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedMimeTypeRef = useRef<string>('audio/webm');
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<any>(null);
  const baseTranscriptRef = useRef<string>('');
  const restartTimeoutRef = useRef<any>(null);
  const sessionCapturedSpeechRef = useRef<boolean>(false);
  const wavRecorderRef = useRef<WavAudioRecorder>(new WavAudioRecorder());
  const hasSpokenRef = useRef<boolean>(false);
  const lastSpokenTimeRef = useRef<number>(0);

  // Platform environment detection for seamless microphone support
  const isElectron = typeof window !== 'undefined' && (
    /electron/i.test(navigator.userAgent) ||
    /MineMindDesktop/i.test(navigator.userAgent) ||
    Boolean((window as any).IS_ELECTRON_DESKTOP) ||
    Boolean((window as any).process?.versions?.electron)
  );
  const isCapacitorNative = typeof window !== 'undefined' && Boolean(
    (window as any).Capacitor?.isNativePlatform?.() ||
    (/android/i.test(navigator.userAgent) && (window.location.protocol === 'https:' && window.location.hostname === 'localhost' || window.location.protocol === 'capacitor:'))
  );

  // 1. Proactively check secure context & browser mic permission state on mount
  useEffect(() => {
    // Confirm if the application is running in a secure context (HTTPS or localhost)
    const isSecure = typeof window !== 'undefined' && (
      window.isSecureContext ?? (
        window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      )
    );
    setIsSecureEnv(isSecure);

    // Check Permissions API proactively
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        navigator.permissions.query({ name: 'microphone' as PermissionName })
          .then((permissionStatus) => {
            const currentState = permissionStatus.state;
            setPermissionState(currentState);

            permissionStatus.onchange = () => {
              const updated = permissionStatus.state;
              setPermissionState(updated);
              if (updated === 'granted') {
                setPermissionErrorType(null);
              }
            };
          })
          .catch(() => {
            // Permissions API might throw on some browsers or iframe environments
          });
      } catch (e) {
        // quiet fail
      }
    }
  }, []);

  // Stop real-time audio visualization and recorder
  const stopAudioLevelMeter = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setMicVolumeLevel(0);
  };

  // Start real-time audio visualization from user's live microphone
  const startAudioLevelMeter = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!isListeningRef.current) {
          stopAudioLevelMeter();
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicVolumeLevel(normalized);

        // Track speech activity for visual waveform indicator
        const speechDetected = average > 2.5 || normalized > 5;
        if (speechDetected) {
          hasSpokenRef.current = true;
          lastSpokenTimeRef.current = Date.now();
        }

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (e) {
      console.warn('Audio visualization initialisation error:', e);
    }
  };

  // Helper to test or grant microphone permissions explicitly
  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionErrorType('unsupported');
      setToastMessage({
        type: 'warning',
        text: 'Microphone API is not supported on this device/browser.'
      });
      return false;
    }

    try {
      setSpeechStatusText('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      setPermissionState('granted');
      setPermissionErrorType(null);
      setToastMessage({
        type: 'success',
        text: 'Microphone access granted successfully!'
      });
      // Test audio level for 2 seconds to confirm live input
      startAudioLevelMeter(stream);
      setTimeout(() => {
        if (!isListeningRef.current) {
          stopAudioLevelMeter();
          stream.getTracks().forEach(t => t.stop());
        }
      }, 2500);
      setSpeechStatusText('Microphone ready! Click Voice to speak.');
      return true;
    } catch (err: any) {
      console.warn('Direct microphone access request failed:', err);
      setPermissionState('denied');
      setPermissionErrorType('denied');
      const platformBlockedMsg = isCapacitorNative
        ? 'Microphone permission blocked. Please allow microphone in your Android app permissions.'
        : isElectron
        ? 'Microphone permission blocked. Please check your Windows microphone privacy settings.'
        : 'Microphone permission blocked. Please enable it in browser address bar.';
      setToastMessage({
        type: 'warning',
        text: platformBlockedMsg
      });
      setSpeechStatusText('Microphone permission blocked.');
      return false;
    }
  };

  // Clean up recognition and timers on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      stopAudioLevelMeter();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    // Safety timeout: 25 seconds of continuous recording to allow unhurried questions
    silenceTimerRef.current = setTimeout(() => {
      if (isListeningRef.current) {
        toggleVoiceInput();
      }
    }, 25000);
  };

  // Helper to cleanly stop MediaRecorder and retrieve full audio blob
  const stopMediaRecorderAndGetBlob = async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      const mime = recordedMimeTypeRef.current || recorder?.mimeType || 'audio/webm';

      if (!recorder || recorder.state === 'inactive') {
        if (audioChunksRef.current.length > 0) {
          resolve(new Blob(audioChunksRef.current, { type: mime }));
        } else {
          resolve(null);
        }
        return;
      }

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          resolve(new Blob(audioChunksRef.current, { type: mime }));
        } else {
          resolve(null);
        }
      };

      try {
        recorder.stop();
      } catch (e) {
        if (audioChunksRef.current.length > 0) {
          resolve(new Blob(audioChunksRef.current, { type: mime }));
        } else {
          resolve(null);
        }
      }
    });
  };

  // Convert audio blob to base64 and transcribe via local server endpoint or direct Gemini AI fallback
  const transcribeAudioViaGemini = async (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string) || '';
          setIsTranscribingAudio(true);
          setSpeechStatusText('Transcribing speech with AI...');

          const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '').trim();
          const cleanMime = audioBlob.type || recordedMimeTypeRef.current || 'audio/webm';

          // 1. Attempt local server transcribe endpoint first (used in web & desktop with running server)
          try {
            const res = await fetch('/api/ai/transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioData: base64Data,
                mimeType: cleanMime,
                lang: speechLang,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              if (data.text && typeof data.text === 'string' && data.text.trim()) {
                resolve(data.text.trim());
                return;
              }
            }
          } catch (serverErr) {
            console.warn('[Voice] Local server transcribe endpoint failed/skipped, falling back to direct AI:', serverErr);
          }

          // 2. Direct Gemini Multimodal REST API fallback (vital for standalone Android APK & offline app)
          const geminiApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
          if (geminiApiKey && cleanBase64) {
            const candidateModels = [
              'gemini-3.7-flash',
              'gemini-3.8-flash',
              'gemini-3.5-flash',
              'gemini-3.1-flash-lite'
            ];
            for (const model of candidateModels) {
              try {
                const directRes = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [
                        {
                          role: 'user',
                          parts: [
                            {
                              inlineData: {
                                mimeType: cleanMime,
                                data: cleanBase64,
                              },
                            },
                            {
                              text: `You are a strict verbatim speech-to-text transcriber. Transcribe EXACTLY and ONLY the words spoken by the user in this audio (language: ${speechLang || 'English / Hindi'}).
- If the user says simple words like "hello", "hello hello", "testing", or any greetings, transcribe them verbatim.
- If the user speaks a mining question, transcribe their exact spoken words.
- NEVER invent, hallucinate, assume, or substitute words that were not spoken.
- Return ONLY the exact transcribed text with no quotation marks or commentary.
- If the audio is silence, background noise, or unintelligible, return an empty string.`,
                            },
                          ],
                        },
                      ],
                    }),
                  }
                );

                if (directRes.ok) {
                  const directData = await directRes.json();
                  const candidateText = directData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
                  const cleanText = candidateText.replace(/^["']|["']$/g, '').trim();
                  const isInvalid = !cleanText || 
                    cleanText.toLowerCase().includes('no audio file') || 
                    cleanText.toLowerCase().includes('unable to access') || 
                    cleanText.toLowerCase().includes('[silence]');

                  if (!isInvalid) {
                    resolve(cleanText);
                    return;
                  }
                }
              } catch (directErr) {
                console.warn(`[Voice] Direct model ${model} transcription attempt failed:`, directErr);
              }
            }
          }

          resolve('');
        } catch (err) {
          console.warn('[Voice] Audio transcription error:', err);
          resolve('');
        } finally {
          setIsTranscribingAudio(false);
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(audioBlob);
    });
  };

  // Process potential spoken command keywords
  const processVoiceCommands = (fullSpokenText: string): { isCommand: boolean; cleanedQuery?: string; commandType?: string } => {
    const lower = fullSpokenText.toLowerCase().trim();

    // 1. Submit / Search commands
    const submitTriggers = [
      'ask question', 'search records', 'submit query', 'ask ai', 'find this', 
      'please search', 'search now', 'submit now', 'run query', 'khojo', 'pucho'
    ];
    for (const trigger of submitTriggers) {
      if (lower.endsWith(trigger) || lower.startsWith(trigger)) {
        const cleaned = fullSpokenText
          .replace(new RegExp(`^${trigger}\\s*`, 'i'), '')
          .replace(new RegExp(`\\s*${trigger}$`, 'i'), '')
          .trim();
        return { isCommand: true, cleanedQuery: cleaned || fullSpokenText, commandType: 'SUBMIT' };
      }
    }

    // 2. Clear query command
    if (lower === 'clear' || lower === 'clear query' || lower === 'reset query' || lower === 'mitao' || lower === 'clear input') {
      return { isCommand: true, commandType: 'CLEAR' };
    }

    // 3. Read aloud command
    if (lower === 'read aloud' || lower === 'speak answer' || lower === 'read answer' || lower === 'bol kar batao') {
      return { isCommand: true, commandType: 'SPEAK' };
    }

    return { isCommand: false };
  };

  const startLiveSpeechRecognition = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // 1. Acquire live microphone stream for real-time visualization and MediaRecorder audio backup
    let stream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        mediaStreamRef.current = stream;
        startAudioLevelMeter(stream);
        setPermissionState('granted');
        setPermissionErrorType(null);

        // Start WAV audio recorder for lossless 16kHz PCM capture
        try {
          await wavRecorderRef.current.start(stream);
        } catch (wavErr) {
          console.warn('Wav recorder setup note:', wavErr);
        }

        // Start MediaRecorder in parallel for high-fidelity fallback transcription
        audioChunksRef.current = [];
        let chosenMime = '';
        if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            chosenMime = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            chosenMime = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            chosenMime = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/aac')) {
            chosenMime = 'audio/aac';
          }
        }
        recordedMimeTypeRef.current = chosenMime || 'audio/webm';

        try {
          const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.start(250); // Slice every 250ms
        } catch (recErr) {
          console.warn('MediaRecorder setup note:', recErr);
        }
      } catch (err: any) {
        console.warn('Microphone stream permission error:', err);
        const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
        if (isDenied) {
          setPermissionState('denied');
          setPermissionErrorType('denied');
          setIsListening(false);
          isListeningRef.current = false;
          stopAudioLevelMeter();
          const deniedMsg = isCapacitorNative
            ? 'Microphone permission denied. Please allow microphone access in your phone app settings.'
            : isElectron
            ? 'Microphone permission denied. Please check your Windows microphone privacy settings.'
            : 'Microphone permission denied. Please allow microphone in your browser address bar.';
          setToastMessage({
            type: 'warning',
            text: deniedMsg
          });
          setSpeechStatusText('Microphone permission blocked.');
          return;
        }
      }
    }

    // Stop any existing recognition session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    sessionCapturedSpeechRef.current = false;

    // In Electron, Chromium lacks Google Cloud Speech keys and immediately fails with network glitch loop.
    // Use AI Voice Recorder directly with live AudioContext waveform and Gemini transcription.
    if (isElectron || !SpeechRecognition) {
      setIsListening(true);
      isListeningRef.current = true;
      setSpeechStatusText('Listening to your voice... Speak your question clearly.');
      resetSilenceTimer();
      return;
    }

    try {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.maxAlternatives = 1;
      recognizer.lang = speechLang;

      baseTranscriptRef.current = question ? question.trim() + ' ' : '';
      setInterimSpokenText('');

      recognizer.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setSpeechStatusText('Microphone active. Speak your mining technical question...');
        resetSilenceTimer();
      };

      recognizer.onresult = (event: any) => {
        let interimTranscript = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (currentFinal) {
          baseTranscriptRef.current += currentFinal;
        }

        const combinedText = (baseTranscriptRef.current + interimTranscript).replace(/\s+/g, ' ').trim();
        setInterimSpokenText(interimTranscript);
        
        if (combinedText) {
          sessionCapturedSpeechRef.current = true;
          setQuestion(combinedText);
          setSpeechStatusText(`Listening: "${combinedText.slice(-45)}"`);
          resetSilenceTimer();

          // Check for voice command triggers
          const cmdCheck = processVoiceCommands(combinedText);
          if (cmdCheck.isCommand) {
            if (cmdCheck.commandType === 'SUBMIT') {
              setVoiceCommandDetected('COMMAND DETECTED: SUBMITTING QUERY');
              sounds.playSuccess();
              toggleVoiceInput();
              if (cmdCheck.cleanedQuery) {
                setQuestion(cmdCheck.cleanedQuery);
                handleAsk(cmdCheck.cleanedQuery);
              }
            } else if (cmdCheck.commandType === 'CLEAR') {
              setVoiceCommandDetected('COMMAND DETECTED: CLEARED QUERY');
              sounds.playClick();
              setQuestion('');
              baseTranscriptRef.current = '';
              setInterimSpokenText('');
            } else if (cmdCheck.commandType === 'SPEAK') {
              setVoiceCommandDetected('COMMAND DETECTED: SPEAKING ANSWER');
              speakAnswerAloud();
            }
          }
        }
      };

      recognizer.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          // If cloud speech service blocked or not allowed, fallback smoothly to AI Voice Recorder
          if (event.error === 'service-not-allowed' && mediaStreamRef.current) {
            console.warn('[Speech] Service not allowed, switching to AI Voice Recorder');
            try { recognizer.abort(); } catch {}
            recognitionRef.current = null;
            setSpeechStatusText('Listening via AI Voice Recorder... Click Done when finished.');
            return;
          }
          setPermissionState('denied');
          setPermissionErrorType('denied');
          setIsListening(false);
          isListeningRef.current = false;
          stopAudioLevelMeter();
          setToastMessage({
            type: 'warning',
            text: 'Microphone permission denied.'
          });
          setSpeechStatusText('Microphone permission blocked.');
        } else if (event.error === 'no-speech') {
          setSpeechStatusText('Listening... Speak your question into your microphone.');
        } else if (event.error === 'network') {
          // If cloud speech network fails (common in standalone webviews/electron), abort recognizer and keep recording audio for AI
          console.warn('[Speech] Cloud recognition network error, switching seamlessly to AI Voice Recorder');
          try { recognizer.abort(); } catch {}
          recognitionRef.current = null;
          setSpeechStatusText('Listening via AI Voice Recorder... Speak and click Done to transcribe.');
        } else {
          setSpeechStatusText(`Voice input: ${event.error}`);
        }
      };

      recognizer.onend = () => {
        // Auto-restart recognition only if recognizer wasn't cleared/aborted and user is still in listening mode
        if (recognitionRef.current && isListeningRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && isListeningRef.current) {
              try {
                recognizer.start();
              } catch (e) {
                console.warn('Recognition auto-restart note:', e);
              }
            }
          }, 150);
          return;
        }

        if (!recognitionRef.current) {
          // If recognizer was aborted to switch to recorder, keep listening state active
          return;
        }

        setIsListening(false);
        recognitionRef.current = null;
        setInterimSpokenText('');
        stopAudioLevelMeter();
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };

      recognitionRef.current = recognizer;
      isListeningRef.current = true;
      setIsListening(true);
      recognizer.start();
    } catch (err: any) {
      console.warn('SpeechRecognition start failed, defaulting to AI Voice Recorder:', err);
      // Keep MediaRecorder active as fallback
      setIsListening(true);
      isListeningRef.current = true;
      setSpeechStatusText('Listening via AI Voice Recorder... Click Done when finished.');
    }
  };

  const toggleVoiceInput = async () => {
    // Stop reading answer aloud if currently playing
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    // 1. If currently listening, stop and finalize
    if (isListening || isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      setInterimSpokenText('');

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }

      // Stop WAV recorder and MediaRecorder
      let audioBlob: Blob | null = null;
      try {
        audioBlob = await wavRecorderRef.current.stop();
      } catch (wavErr) {
        console.warn('WAV stop error:', wavErr);
      }

      if (!audioBlob || audioBlob.size <= 200) {
        audioBlob = await stopMediaRecorderAndGetBlob();
      }
      stopAudioLevelMeter();

      // Check if we captured new spoken text from Web Speech API in this session
      if (sessionCapturedSpeechRef.current && question.trim()) {
        sounds.playSuccess();
        setSpeechStatusText('Voice captured! Generating answer...');
        handleAsk(question.trim());
      } else if (audioBlob && audioBlob.size > 200) {
        // Voice Recorder mode or speech recognition fallback: Use Multimodal AI Voice Transcription
        setSpeechStatusText('Transcribing speech with Gemini AI...');
        const transcribed = await transcribeAudioViaGemini(audioBlob);
        if (transcribed) {
          setQuestion(transcribed);
          sounds.playSuccess();
          setSpeechStatusText(`Captured: "${transcribed}". Generating answer...`);
          setToastMessage({
            type: 'success',
            text: 'Voice captured! Generating verified answer...'
          });
          handleAsk(transcribed);
          return;
        }
        setSpeechStatusText('No spoken voice detected. Click Voice to try again.');
      } else {
        setSpeechStatusText('Voice recording stopped.');
      }
      return;
    }

    // 2. Start live speech recognition / recording with user's microphone
    startLiveSpeechRecognition();
  };

  // Keyboard shortcut (Ctrl+Space / Cmd+Space) to trigger Voice listening mode
  useEffect(() => {
    const handleVoiceShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        toggleVoiceInput();
      }
    };

    window.addEventListener('keydown', handleVoiceShortcut);
    return () => {
      window.removeEventListener('keydown', handleVoiceShortcut);
    };
  }, [permissionState, isListening, isSecureEnv, speechLang, question]);

  // Text-To-Speech function to speak answer aloud
  const speakAnswerAloud = (textToSpeak?: string) => {
    if (!('speechSynthesis' in window)) {
      setToastMessage({
        type: 'warning',
        text: 'Text-to-speech is not supported on this device/browser.',
      });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const rawText = textToSpeak || activeResult?.answer || displayedAnswer;
    if (!rawText) return;

    // Clean text from markdown formatting, asterisks, brackets for natural voice synthesis
    const cleanText = rawText
      .replace(/[*_~`#\[\]\(\)]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.96; // Slightly steady pace for technical & geological metrics
    utterance.pitch = 1.0;

    // Prefer English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-US'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleAsk = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim()) return;

    setIsSearching(true);
    setActiveResult(null);
    setDisplayedAnswer('');
    setShowDraftReply(false);

    // If Underground / Offline Mode is active, bypass cloud and query local offline cache directly
    if (isUndergroundModeActive) {
      setTimeout(() => {
        const offlineData = queryOfflineKnowledgeBase(
          q,
          chunks.filter(c => c.isApproved),
          selectedSubsidiary
        );

        setIsOfflineResult(true);
        setActiveResult(offlineData);
        addQueryRecord({
          questionText: q,
          foundInKnowledgeBase: offlineData.foundInKnowledgeBase,
          answerText: offlineData.answer,
          aiSummary: offlineData.aiSummary,
          confidence: offlineData.confidence,
          citations: offlineData.citations,
          draftOfficialReply: offlineData.draftOfficialReply,
        });

        // Typewriter effect
        let i = 0;
        const text = offlineData.answer;
        const interval = setInterval(() => {
          setDisplayedAnswer(text.slice(0, i + 8));
          i += 8;
          if (i > text.length) {
            clearInterval(interval);
            setDisplayedAnswer(text);
          }
        }, 12);

        setIsSearching(false);
      }, 350);
      return;
    }

    try {
      console.log('[AiAssistant] Dispatching query to backend /api/ai/ask (xAI Grok API endpoint)...', {
        question: q,
        subsidiary: selectedSubsidiary,
      });

      // Call full-stack server endpoint /api/ai/ask
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          approvedChunks: chunks.filter(c => c.isApproved),
          subsidiaryFilter: selectedSubsidiary,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log('[AiAssistant] Received response from /api/ai/ask:', {
        foundInKnowledgeBase: data.foundInKnowledgeBase,
        provider: data.provider || 'xai-grok',
        modelUsed: data.modelUsed,
        confidence: data.confidence,
        citationsCount: data.citations?.length || 0,
      });

      setIsOfflineResult(false);
      setActiveResult(data);
      addQueryRecord({
        questionText: q,
        foundInKnowledgeBase: data.foundInKnowledgeBase,
        answerText: data.answer,
        aiSummary: data.aiSummary,
        confidence: data.confidence,
        citations: data.citations || [],
        draftOfficialReply: data.draftOfficialReply,
      });

      // Stream / Reveal animation
      if (data.answer) {
        let i = 0;
        const text = data.answer;
        const interval = setInterval(() => {
          setDisplayedAnswer(text.slice(0, i + 8));
          i += 8;
          if (i > text.length) {
            clearInterval(interval);
            setDisplayedAnswer(text);
            if (autoSpeakAnswer && data.foundInKnowledgeBase) {
              speakAnswerAloud(text);
            }
          }
        }, 15);
      }
    } catch (err) {
      console.warn('Online AI ask failed; falling back to offline underground RAG:', err);
      const offlineFallback = queryOfflineKnowledgeBase(
        q,
        chunks.filter(c => c.isApproved),
        selectedSubsidiary
      );

      setIsOfflineResult(true);
      setActiveResult(offlineFallback);
      addQueryRecord({
        questionText: q,
        foundInKnowledgeBase: offlineFallback.foundInKnowledgeBase,
        answerText: offlineFallback.answer,
        aiSummary: offlineFallback.aiSummary,
        confidence: offlineFallback.confidence,
        citations: offlineFallback.citations,
        draftOfficialReply: offlineFallback.draftOfficialReply,
      });
      setDisplayedAnswer(offlineFallback.answer);
      if (autoSpeakAnswer && offlineFallback.foundInKnowledgeBase) {
        speakAnswerAloud(offlineFallback.answer);
      }
    } finally {
      setIsSearching(false);
    }
  };


  const handleCopyToReport = () => {
    if (!activeResult) return;
    setReportDraftFromAi({
      text: activeResult.answer,
      citations: activeResult.citations,
    });
    setToastMessage({
      type: 'success',
      text: 'Findings & citations copied to Report Generator wizard!'
    });
    setActiveView('reports');
  };

  const handleCopyText = (text: string, isDraft = false) => {
    navigator.clipboard.writeText(text);
    if (isDraft) {
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    } else {
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 2000);
    }
  };

  // Filter similar cases if search query matches tags
  const matchedCases = similarCases.filter(sc => {
    if (!question) return true;
    const qLower = question.toLowerCase();
    return sc.tags.some(t => qLower.includes(t.toLowerCase())) || 
           sc.subsidiary.toLowerCase().includes(qLower) ||
           qLower.includes('slope') && sc.title.includes('Slope') ||
           qLower.includes('water') && sc.title.includes('Water') ||
           qLower.includes('hydrogeology') && sc.title.includes('Groundwater');
  });

  return (
    <div id="ai-assistant-view" className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Banner: Strict Grounding Directives */}
      <div className="bg-white text-[#0B2238] border border-[#D1DCE5] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-sans font-bold text-base sm:text-lg text-[#0B2238] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00529B]" />
            <span>Ask Governed CMPDI & CIL Records</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5 font-medium">
            Every sentence and metric is linked to approved repository chunks. Unverifiable questions explicitly return "Not Found".
          </p>
        </div>
      </div>

      {/* Main Search Input & Presets */}
      <div className="bg-white border border-[#D1DCE5] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        {/* Live Microphone Voice Input Active Banner */}
        {isListening && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3.5 sm:p-4 shadow-xs space-y-2.5 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#DC2626] font-mono tracking-wide">
                      RECORDING YOUR VOICE (LIVE MIC)
                    </span>
                    <span className="text-[10px] font-mono text-[#991B1B] bg-red-100 px-1.5 py-0.5 rounded">
                      {speechLang}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7F1D1D] mt-0.5">
                    Speak naturally. Words are continuously transcribed. Say <strong className="font-semibold">"Search"</strong> or <strong className="font-semibold">"Ask"</strong> to submit, or <strong className="font-semibold">"Clear"</strong> to reset.
                  </p>
                </div>
              </div>

              {/* Real-time Voice Audio Visualizer Equalizer */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white/80 border border-[#FECACA] px-2.5 py-1.5 rounded-lg">
                  <span className="text-[10px] font-mono text-[#991B1B] mr-1">Mic Level:</span>
                  {[0.4, 0.7, 1.0, 0.6, 0.8, 0.5, 0.9].map((multiplier, idx) => {
                    const barHeight = Math.max(4, Math.min(22, (micVolumeLevel || 10) * multiplier * 0.25));
                    return (
                      <span
                        key={idx}
                        className="w-1 bg-[#DC2626] rounded-full transition-all duration-75"
                        style={{ height: `${barHeight}px` }}
                      />
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Square className="w-3 h-3 fill-white" />
                  <span>Done Speaking</span>
                </button>
              </div>
            </div>

            {/* Interim live preview */}
            {interimSpokenText && (
              <div className="text-xs bg-white/90 border border-[#FECACA] rounded-lg px-3 py-1.5 text-[#1E293B] font-medium flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-[#DC2626] font-bold">Hearing now:</span>
                <span className="italic text-[#334155]">"{interimSpokenText}"</span>
              </div>
            )}
          </div>
        )}

        {/* AI Multimodal Transcribing Loader Banner */}
        {isTranscribingAudio && (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 shadow-xs flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#2563EB] animate-spin shrink-0" />
            <div className="text-xs text-[#1E40AF]">
              <strong className="font-semibold">Transcribing Voice with Gemini Multimodal AI:</strong> Processing audio recording with mining & CIL technical vocabulary grounding...
            </div>
          </div>
        )}

        {/* Voice Command feedback toast notification */}
        {voiceCommandDetected && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] rounded-xl p-2.5 px-3.5 shadow-xs flex items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#059669]" />
              <span className="font-bold">{voiceCommandDetected}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceCommandDetected(null)}
              className="text-[#059669] hover:underline text-[10px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}


        <form onSubmit={(e) => { e.preventDefault(); handleAsk(); }} className="relative">
          <textarea
            ref={textareaRef}
            id="input-ai-question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              isListening
                ? "Listening... Speak your mining query naturally (will auto-transcribe when you pause or click Done Speaking)..."
                : "Type or click Voice to speak your query into your microphone (e.g. reserve figures, borehole depths, DGMS setback rules, coal grades)..."
            }
            className="w-full p-3 sm:p-4 pb-14 sm:pb-4 pr-3 sm:pr-40 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl focus:outline-none focus:border-[#00529B] focus:bg-white text-[#0B2238] placeholder:text-[#94A3B8] resize-none transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            {/* Voice Command Microphone Button */}
            <button
              type="button"
              id="btn-voice-input"
              onClick={toggleVoiceInput}
              disabled={isTranscribingAudio}
              title={
                isTranscribingAudio
                  ? 'Transcribing audio with AI...'
                  : isListening
                  ? 'Click Done Speaking to transcribe your voice'
                  : 'Click or press Ctrl+Space to speak your own question using microphone'
              }
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer select-none ${
                isTranscribingAudio
                  ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#93C5FD] cursor-wait'
                  : isListening
                  ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white ring-2 ring-red-400 ring-offset-1 border border-[#991B1B] animate-pulse'
                  : 'bg-white hover:bg-[#F1F5F9] text-[#0B2238] border border-[#CBD5E1] hover:border-[#00529B]'
              }`}
            >
              {isTranscribingAudio ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-[#2563EB] animate-spin" />
                  <span className="inline text-[11px] font-medium text-[#1D4ED8]">Transcribing...</span>
                </>
              ) : isListening ? (
                <>
                  <div className="flex items-center gap-0.5 px-0.5">
                    <span className="w-1 h-3.5 bg-white rounded-full animate-bounce"></span>
                    <span className="w-1 h-4.5 bg-white rounded-full animate-bounce delay-75"></span>
                    <span className="w-1 h-3 bg-white rounded-full animate-bounce delay-150"></span>
                  </div>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span className="inline text-[11px] font-mono font-bold">Done Speaking</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-[#D97706]" />
                  <span className="inline text-[11px] font-medium">Voice</span>
                  <span className="hidden sm:inline-block font-mono text-[9px] text-[#64748B] bg-[#F1F5F9] px-1 py-0.5 rounded border border-[#E2E8F0]">
                    Ctrl+Space
                  </span>
                </>
              )}
            </button>

            {/* Ask Grounded Submit Button */}
            <button
              type="submit"
              id="btn-submit-ai-question"
              disabled={isSearching || !question.trim()}
              className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {isSearching ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-white animate-spin" />
                  <span>Retrieving...</span>
                </>
              ) : (
                <>
                  <span>Ask</span>
                  <Send className="w-3.5 h-3.5 text-white" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Audio & Voice Preferences Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EFEBE2]">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#141C2B] cursor-pointer">
              <input
                type="checkbox"
                id="checkbox-auto-speak"
                checked={autoSpeakAnswer}
                onChange={(e) => setAutoSpeakAnswer(e.target.checked)}
                className="rounded text-[#C8892E] focus:ring-0 cursor-pointer"
              />
              <span className="font-mono text-[11px]">Auto-read answers aloud (Voice synthesis)</span>
            </label>

            {/* Language Selector for Speech */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Globe className="w-3.5 h-3.5 text-[#C8892E]" />
              <span className="text-[11px] font-mono">Mic Lang:</span>
              <select
                value={speechLang}
                onChange={(e) => setSpeechLang(e.target.value)}
                className="text-[11px] font-mono bg-[#FAF8F3] border border-[#E4E0D6] rounded px-1.5 py-0.5 text-[#141C2B] focus:outline-none focus:border-[#C8892E] cursor-pointer"
              >
                <option value="en-IN">English (India - en-IN)</option>
                <option value="hi-IN">Hindi / Hinglish (hi-IN)</option>
                <option value="en-US">English (Global - en-US)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowVoiceHelp(!showVoiceHelp)}
              className="text-[11px] font-mono text-[#64748B] hover:text-[#C8892E] flex items-center gap-1 cursor-pointer"
            >
              <HelpIcon className="w-3 h-3 text-[#C8892E]" />
              <span>Voice Commands Cheat Sheet</span>
            </button>

            {speechStatusText && (
              <span className="text-[11px] font-mono text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A] flex items-center gap-1">
                <Radio className="w-3 h-3 text-[#D97706] animate-pulse" />
                <span>{speechStatusText}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSpeaking && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E] bg-[#FEF3C7] border border-[#FDE68A] px-2.5 py-0.5 rounded-full animate-pulse">
                <Volume2 className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Speaking answer aloud...</span>
                <button
                  onClick={stopSpeaking}
                  className="text-[10px] underline font-bold text-[#92400E] hover:text-black ml-1 cursor-pointer"
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Voice Commands Cheat Sheet Drawer */}
        {showVoiceHelp && (
          <div className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl p-3.5 text-xs text-[#1E293B] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs font-mono text-[#141C2B] uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#C8892E]" /> Spoken Voice Commands & Controls
              </span>
              <button
                type="button"
                onClick={() => setShowVoiceHelp(false)}
                className="text-xs text-[#64748B] hover:text-black cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-[#E4E0D6]">
                <strong className="text-[#C8892E] block mb-0.5">Submit Query</strong>
                <span>Say <em>"Search records"</em>, <em>"Ask"</em>, or <em>"Submit query"</em> at the end of your question.</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E4E0D6]">
                <strong className="text-[#C8892E] block mb-0.5">Clear Text</strong>
                <span>Say <em>"Clear query"</em> or <em>"Reset"</em> to wipe the question field and start over.</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E4E0D6]">
                <strong className="text-[#C8892E] block mb-0.5">Listen Aloud</strong>
                <span>Say <em>"Read aloud"</em> or <em>"Speak answer"</em> to hear the retrieved record read to you.</span>
              </div>
            </div>
          </div>
        )}

        {/* Preset Query Chips (Section 5.5 Spec) */}
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#0B2238] mb-2.5 font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Preset Technical Inquiries ({selectedSubsidiary === 'ALL' ? 'All Subsidiaries' : `${selectedSubsidiary} Scope`}):</span>
            </div>
            {selectedSubsidiary !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedSubsidiary('ALL')}
                className="text-[10px] text-[#D97706] hover:underline font-mono cursor-pointer"
              >
                Reset to All CIL Subsidiaries
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(SUBSIDIARY_PRESETS[selectedSubsidiary] || SUBSIDIARY_PRESETS.ALL).map((pq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuestion(pq);
                  handleAsk(pq);
                }}
                className="text-left text-xs bg-[#F8FAFC] hover:bg-[#F0F4F8] text-[#1E293B] hover:text-[#00529B] px-3.5 py-2 rounded-xl border border-[#CBD5E1] hover:border-[#00529B] transition-all font-medium cursor-pointer shadow-2xs"
              >
                {pq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Answer & Citations Layout */}
      <div className="space-y-6">
        {/* Answer Main Panel */}
        <div className="space-y-6">
          {isSearching && (
            <div className="bg-white border border-[#E4E0D6] rounded-xl p-8 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-[#C8892E] animate-spin mx-auto" />
              <h3 className="font-sans font-bold text-base text-[#141C2B]">
                Cross-Referencing Approved Chunks...
              </h3>
              <p className="text-xs text-[#64748B] font-mono">
                Scanning {chunks.filter(c => c.isApproved).length} approved vector records for {selectedSubsidiary === 'ALL' ? 'all CIL subsidiaries' : selectedSubsidiary}
              </p>
            </div>
          )}

          {activeResult && !isSearching && (
            <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-5">
              {/* Status Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE2]">
                <div className="flex flex-wrap items-center gap-2">
                  {activeResult.foundInKnowledgeBase ? (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#16A34A] bg-[#F0FDF4] px-2.5 py-1 rounded-md border border-[#BBF7D0]">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{activeResult.confidence.toFixed(1)}% Grounded Confidence</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#DC2626] bg-[#FEF2F2] px-2.5 py-1 rounded-md border border-[#FECACA]">
                      <AlertCircle className="w-4 h-4" />
                      <span>Zero Supporting Records Found</span>
                    </span>
                  )}
                  
                  {isOfflineResult && (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#92400E] bg-[#FEF3C7] px-2.5 py-1 rounded-md border border-[#FDE68A]">
                      <HardDrive className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>Underground Cache (Offline RAG)</span>
                    </span>
                  )}

                  <span className="text-xs font-mono text-[#64748B]">
                    Strict Source Grounding Enforced
                  </span>
                </div>

                {/* Top Action Buttons */}
                {activeResult.foundInKnowledgeBase && (
                  <div className="flex items-center gap-2">
                    {/* Voice Read Aloud Button */}
                    <button
                      id="btn-voice-readout"
                      onClick={() => speakAnswerAloud()}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        isSpeaking
                          ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] hover:bg-[#FDE68A]'
                          : 'bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] border-[#E4E0D6]'
                      }`}
                      title={isSpeaking ? 'Stop speaking answer' : 'Listen to answer via voice synthesizer'}
                    >
                      {isSpeaking ? (
                        <>
                          <Square className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706]" />
                          <span>Stop Voice</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-[#C8892E]" />
                          <span>Listen Aloud</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCopyText(activeResult.answer)}
                      className="px-2.5 py-1 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] rounded text-xs font-semibold text-[#141C2B] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy plain answer text"
                    >
                      {copiedAnswer ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
                      <span>{copiedAnswer ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={handleCopyToReport}
                      className="px-3 py-1 bg-[#141C2B] hover:bg-[#1E293B] text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Send findings and citations directly into the Report Generator"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#C8892E]" />
                      <span>Copy to Report</span>
                    </button>
                  </div>
                )}
              </div>

              {/* AI Summary One-Liner (Section 5.5 Spec) */}
              {activeResult.foundInKnowledgeBase && activeResult.aiSummary && (
                <div className="bg-[#FAF8F3] border-l-4 border-[#C8892E] p-3 rounded-r-lg">
                  <div className="text-[10px] font-mono uppercase font-bold text-[#C8892E] tracking-wider mb-0.5">
                    AI Verified Summary Line:
                  </div>
                  <p className="text-xs font-semibold text-[#141C2B]">
                    {activeResult.aiSummary}
                  </p>
                </div>
              )}

              {/* Spoken Audio Playback Active Bar */}
              {isSpeaking && (
                <div className="bg-[#FAF8F3] border border-[#FDE68A] rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-4 bg-[#C8892E] animate-pulse rounded-full"></span>
                      <span className="w-1.5 h-6 bg-[#C8892E] animate-pulse delay-75 rounded-full"></span>
                      <span className="w-1.5 h-3 bg-[#C8892E] animate-pulse delay-150 rounded-full"></span>
                      <span className="w-1.5 h-5 bg-[#C8892E] animate-pulse delay-100 rounded-full"></span>
                    </div>
                    <span className="text-xs font-mono font-medium text-[#141C2B]">
                      Voice synthesizer is reading technical findings & citations aloud...
                    </span>
                  </div>

                  <button
                    onClick={stopSpeaking}
                    className="px-2.5 py-1 bg-[#141C2B] text-white hover:bg-[#1E293B] rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Square className="w-3 h-3 text-[#C8892E] fill-[#C8892E]" />
                    <span>Stop Audio</span>
                  </button>
                </div>
              )}

              {/* Generated Answer / Explicit Empty State */}
              <div className="text-sm sm:text-[15px] leading-relaxed sm:leading-7 text-[#141C2B] font-sans">
                {activeResult.foundInKnowledgeBase ? (
                  <div className="space-y-3 whitespace-pre-line font-normal text-[#1E293B]">
                    {displayedAnswer}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-[#FAF8F3] rounded-lg border border-dashed border-[#E4E0D6] p-6 space-y-4">
                    <AlertCircle className="w-8 h-8 text-[#DC2626] mx-auto" />
                    <div>
                      <p className="font-sans font-bold text-base text-[#141C2B]">
                        No supporting information was found in the available organizational documents.
                      </p>
                      <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
                        MineMind AI enforces strict source-grounding and will not fabricate answers without verified records.
                      </p>
                    </div>

                    {/* Helpful Resolution Box if Subsidiary Filter is active */}
                    {selectedSubsidiary !== 'ALL' && (
                      <div className="bg-[#FFFFFF] border border-[#E4E0D6] rounded-lg p-4 max-w-lg mx-auto text-left space-y-3 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                          <HelpCircle className="w-4 h-4 text-[#C8892E] flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-[#334155]">
                            <span className="font-semibold text-[#141C2B]">Active Subsidiary Scope: {selectedSubsidiary}</span>
                            <p className="text-[11px] text-[#64748B] mt-0.5">
                              Your search is restricted strictly to {selectedSubsidiary} records. If your query refers to another subsidiary (e.g. Korba in SECL or Jharia in BCCL), broaden your scope to All Subsidiaries.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSubsidiary('ALL');
                              // Automatically re-run query across all subsidiaries
                              if (question.trim()) {
                                handleAsk(question);
                              }
                            }}
                            className="px-3.5 py-1.5 bg-[#141C2B] hover:bg-[#1E293B] text-white text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Globe className="w-3.5 h-3.5 text-[#C8892E]" />
                            <span>Search Across All Subsidiaries (Switch Scope to ALL)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Subsidiary-Specific Suggested Queries */}
                    {SUBSIDIARY_PRESETS[selectedSubsidiary] && selectedSubsidiary !== 'ALL' && (
                      <div className="text-left max-w-lg mx-auto pt-2">
                        <span className="text-[11px] font-mono font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
                          Try these approved queries for {selectedSubsidiary}:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {SUBSIDIARY_PRESETS[selectedSubsidiary].map((sq, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setQuestion(sq);
                                handleAsk(sq);
                              }}
                              className="text-left text-xs bg-white hover:bg-[#FAF8F3] text-[#141C2B] p-2 rounded border border-[#E4E0D6] hover:border-[#C8892E] transition-colors cursor-pointer"
                            >
                              • {sq}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Source Citation Chips (Section 5.5 Spec) */}
              {activeResult.citations.length > 0 && (
                <div className="pt-5 border-t border-[#EFEBE2] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono uppercase tracking-wider text-[#64748B] font-bold flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#C8892E]" />
                      <span>Governed Source Citations ({activeResult.citations.length}):</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      Click card to inspect full audit chunk & verification hash
                    </span>
                  </div>

                  <div className={`grid grid-cols-1 ${activeResult.citations.length > 1 ? 'xl:grid-cols-2' : ''} gap-4`}>
                    {activeResult.citations.map((citation, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveCitationForModal(citation)}
                        className="p-4 sm:p-5 bg-[#FAF8F3] hover:bg-[#FDFBF7] border border-[#E4E0D6] hover:border-[#C8892E] rounded-xl cursor-pointer transition-all shadow-2xs group space-y-3"
                      >
                        {/* Citation Badges Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-[#EFEBE2] text-[#141C2B] px-2.5 py-1 rounded-md border border-[#DCD6C8]">
                              {citation.documentCode} v{citation.versionNumber}.0
                            </span>
                            {citation.subsidiary && (
                              <span className="font-mono text-[11px] font-semibold bg-white text-[#64748B] px-2 py-0.5 rounded border border-[#E4E0D6]">
                                {citation.subsidiary}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono font-medium text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-2.5 py-1 rounded-md flex items-center gap-1.5">
                            <span>{citation.pageOrSheetRef}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-[#C8892E] group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>

                        {/* Document Title */}
                        <h4 className="font-sans font-bold text-sm sm:text-base text-[#141C2B] leading-snug group-hover:text-[#C8892E] transition-colors">
                          {citation.documentTitle}
                        </h4>

                        {/* Verified Excerpt Box */}
                        <div className="bg-white p-3.5 rounded-lg border border-[#E4E0D6] group-hover:border-[#D4CEBF] transition-colors">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B] mb-1">
                            Verified Source Excerpt:
                          </div>
                          <p className="text-xs sm:text-[13px] text-[#334155] leading-relaxed italic font-sans">
                            "{citation.excerpt}"
                          </p>
                        </div>

                        {/* Card Action Link */}
                        <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[#C8892E] group-hover:text-[#92400E]">
                          <span className="font-medium">Direct Grounding Vector Chunk</span>
                          <span className="font-bold flex items-center gap-1 group-hover:underline">
                            Inspect Verified Chunk & Hash →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Draft for Parliamentary / Ministry Official Reply Toggle (Section 5.5 Spec) */}
              {activeResult.foundInKnowledgeBase && (
                <div className="pt-3 border-t border-[#EFEBE2]">
                  <button
                    onClick={() => setShowDraftReply(!showDraftReply)}
                    className="text-xs font-semibold text-[#141C2B] hover:text-[#C8892E] flex items-center gap-2 py-1"
                  >
                    <span>Draft for Parliamentary / Ministry Official Reply</span>
                    {showDraftReply ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showDraftReply && (
                    <div className="mt-3 p-4 bg-[#141C2B] text-white rounded-lg border border-[#1E293B] space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between text-[#C8892E]">
                        <span className="font-bold uppercase tracking-wider text-[11px]">
                          Formal Legislative / Parliamentary Format (Lok Sabha / Rajya Sabha Reference)
                        </span>
                        <button
                          onClick={() => handleCopyText(activeResult.draftOfficialReply || activeResult.answer, true)}
                          className="px-2 py-1 bg-[#243147] hover:bg-[#334155] text-white rounded text-[10px] flex items-center gap-1"
                        >
                          {copiedDraft ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedDraft ? 'Copied Draft' : 'Copy Official Text'}</span>
                        </button>
                      </div>
                      <p className="text-[#E2E8F0] leading-relaxed whitespace-pre-line font-sans text-xs bg-[#0E1522] p-3 rounded border border-[#1E293B]">
                        {activeResult.draftOfficialReply || `In response to the inquiry regarding "${question}", according to approved technical records maintained at ${activeResult.citations[0]?.subsidiary || 'CMPDI'}: ${activeResult.answer}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
