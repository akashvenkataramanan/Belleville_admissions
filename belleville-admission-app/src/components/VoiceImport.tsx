import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Mic, MicOff, Square, Loader2, AlertCircle, Eye, EyeOff, ChevronDown, ChevronUp, Upload, RotateCcw } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { FLOORS } from '../types';

interface VoiceImportProps {
  onImport: (admissions: Array<{ floor: string; patientName: string }>) => void;
}

type UIState = 'idle' | 'recording' | 'transcribing' | 'results' | 'error';

const SPOKEN_WORD_MAP: Record<string, string> = {
  'to north': '2N',
  'two north': '2N',
  'to south': '2S',
  'two south': '2S',
  'to northeast': '2NE',
  'two northeast': '2NE',
  'to center': '2C',
  'two center': '2C',
  'one south': '1S',
  'one center': '1C',
  'three south': '3S',
  'for south': '4S',
  'four south': '4S',
};

function normalizeSpokenWords(text: string): string {
  let result = text.toLowerCase();
  for (const [spoken, code] of Object.entries(SPOKEN_WORD_MAP)) {
    result = result.replace(new RegExp(spoken, 'gi'), code);
  }
  return result;
}

function parseTranscript(text: string): { valid: Array<{ floor: string; patientName: string }>; errors: string[] } {
  const normalized = normalizeSpokenWords(text);
  const segments = normalized.split(/\bnext\b|[,;.\n]/i).map(s => s.trim()).filter(Boolean);

  const valid: Array<{ floor: string; patientName: string }> = [];
  const errors: string[] = [];

  for (const segment of segments) {
    // Normalize dashes: replace spaces around dashes or multiple spaces between floor and room
    const cleaned = segment.replace(/\s*[-–—]\s*/g, '-');
    const match = cleaned.match(/(2NE|1S|1C|2S|2C|3S|4S|2N)\s*-?\s*(\d{2,4})/i);

    if (match) {
      const floor = match[1].toUpperCase();
      const room = match[2];
      const matchedFloor = (FLOORS as readonly string[]).find(f => f === floor);
      if (matchedFloor) {
        valid.push({ floor: matchedFloor, patientName: `${matchedFloor}-${room}` });
      } else {
        errors.push(segment);
      }
    } else {
      errors.push(segment);
    }
  }

  return { valid, errors };
}

function parseLinesForImport(text: string): { valid: Array<{ floor: string; patientName: string }>; errors: string[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const valid: Array<{ floor: string; patientName: string }> = [];
  const errors: string[] = [];

  for (const line of lines) {
    const dashIdx = line.indexOf('-');
    if (dashIdx === -1) {
      errors.push(line);
      continue;
    }
    const floorPart = line.substring(0, dashIdx).trim();
    let matchedFloor = (FLOORS as readonly string[]).find(f => f === floorPart);
    if (!matchedFloor) {
      matchedFloor = (FLOORS as readonly string[]).find(f => f.toLowerCase() === floorPart.toLowerCase());
    }
    if (matchedFloor) {
      valid.push({ floor: matchedFloor, patientName: line });
    } else {
      errors.push(line);
    }
  }

  return { valid, errors };
}

export function VoiceImport({ onImport }: VoiceImportProps) {
  const [apiKey, setApiKey] = useLocalStorage<string>('belleville-openai-api-key', '');
  const [keyInput, setKeyInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [uiState, setUIState] = useState<UIState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [editableText, setEditableText] = useState('');
  const [showRawTranscript, setShowRawTranscript] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const parsed = useMemo(() => parseLinesForImport(editableText), [editableText]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      cleanupStream();
    };
  }, [stopTimer, cleanupStream]);

  const saveKey = () => {
    setApiKey(keyInput.trim());
  };

  const clearKey = () => {
    setApiKey('');
    setKeyInput('');
  };

  const transcribeAudio = useCallback(async (blob: Blob) => {
    setUIState('transcribing');

    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('prompt', 'Hospital room numbers: 2N-201, 3S-302, 1C-115, 2NE-210, 2S-305, 4S-401, 1S-108, 2C-215');

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const transcript = data.text || '';
      setRawTranscript(transcript);

      const result = parseTranscript(transcript);
      const lines = result.valid.map(v => v.patientName);
      if (result.errors.length > 0) {
        lines.push(...result.errors.map(e => `# ERROR: ${e}`));
      }
      setEditableText(lines.join('\n'));
      setUIState('results');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transcription failed';
      setErrorMessage(message);
      setUIState('error');
    }
  }, [apiKey]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Try webm first, fall back to whatever is available
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        cleanupStream();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        transcribeAudio(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);

      setUIState('recording');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not access microphone';
      setErrorMessage(message);
      setUIState('error');
    }
  };

  const stopRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleReparse = () => {
    // Remove error comment lines before re-parsing
    const cleaned = editableText
      .split('\n')
      .filter(l => !l.startsWith('# ERROR:'))
      .join('\n');
    setEditableText(cleaned);
  };

  const handleImport = () => {
    if (parsed.valid.length > 0) {
      onImport(parsed.valid);
      setUIState('idle');
      setRawTranscript('');
      setEditableText('');
    }
  };

  const resetToIdle = () => {
    setUIState('idle');
    setErrorMessage('');
    setRawTranscript('');
    setEditableText('');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // No API key state
  if (!apiKey) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 space-y-3">
        <p className="text-sm text-yellow-300 font-medium">OpenAI API Key Required</p>
        <p className="text-xs text-yellow-400/80">Your key is stored locally in your browser and never sent to our servers.</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm pr-8 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={saveKey}
            disabled={!keyInput.trim()}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-1.5 rounded text-sm text-white transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* API Key management (compact) */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">API Key: ••••{apiKey.slice(-4)}</span>
        <button onClick={clearKey} className="text-xs text-red-400 hover:text-red-300 transition-colors">
          Clear Key
        </button>
      </div>

      {/* Idle state */}
      {uiState === 'idle' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <button
            onClick={startRecording}
            className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors shadow-lg hover:shadow-purple-500/25"
          >
            <Mic className="w-7 h-7 text-white" />
          </button>
          <p className="text-sm text-gray-400">Click to start recording</p>
        </div>
      )}

      {/* Recording state */}
      {uiState === 'recording' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center animate-pulse">
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
          </div>
          <p className="text-lg font-mono text-red-400">{formatTime(elapsedSeconds)}</p>
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-sm text-white transition-colors"
          >
            <Square className="w-4 h-4" />
            Stop Recording
          </button>
        </div>
      )}

      {/* Transcribing state */}
      {uiState === 'transcribing' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-sm text-gray-300">Transcribing with Whisper...</p>
        </div>
      )}

      {/* Results state */}
      {uiState === 'results' && (
        <div className="space-y-3">
          {/* Raw transcript (collapsible) */}
          <button
            onClick={() => setShowRawTranscript(!showRawTranscript)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            {showRawTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Raw Transcript
          </button>
          {showRawTranscript && (
            <div className="bg-gray-700/50 rounded p-2 text-xs text-gray-400 font-mono whitespace-pre-wrap">
              {rawTranscript}
            </div>
          )}

          {/* Editable parsed results */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Parsed results (edit to fix errors, one per line):</label>
            <textarea
              value={editableText}
              onChange={e => setEditableText(e.target.value)}
              rows={6}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleReparse}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            Remove error lines & re-validate
          </button>

          {/* Counts */}
          <p className="text-sm text-gray-300">
            <span className="text-green-400 font-semibold">{parsed.valid.length}</span> valid
            {parsed.errors.length > 0 && (
              <span className="ml-2">
                | <span className="text-red-400 font-semibold">{parsed.errors.length}</span> invalid
              </span>
            )}
          </p>

          {parsed.errors.length > 0 && (
            <div className="bg-red-900/30 border border-red-700/50 rounded p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-400 font-medium">Unrecognized lines:</span>
              </div>
              <div className="space-y-0.5">
                {parsed.errors.map((line, i) => (
                  <div key={i} className="text-xs text-red-300 font-mono">{line}</div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={parsed.valid.length === 0}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors text-white text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Import All ({parsed.valid.length})
            </button>
            <button
              onClick={resetToIdle}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition-colors text-white text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Re-record
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {uiState === 'error' && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MicOff className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium">Error</span>
          </div>
          <p className="text-sm text-red-300">{errorMessage}</p>
          <button
            onClick={resetToIdle}
            className="bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded text-sm text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
