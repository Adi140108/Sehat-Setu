import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, AlertCircle } from 'lucide-react';

interface VoiceRecorderProps {
  onAudioReady: (audioBlob: Blob) => void;
  onTextFallbackRequired: (errorMsg: string) => void;
  isLoading?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onAudioReady, 
  onTextFallbackRequired, 
  isLoading = false 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [browserSupported, setBrowserSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Check MediaRecorder support
  useEffect(() => {
    const hasMedia = typeof navigator !== 'undefined' && navigator.mediaDevices;
    const hasRecorder = typeof window !== 'undefined' && 'MediaRecorder' in window;
    if (!hasMedia || !hasRecorder) {
      setBrowserSupported(false);
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev >= 60) { // Limit to 60 seconds max
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setTimer(0);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  const handleStartRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Stop all tracks on the stream to release the mic icon
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Validation: Too short check (under 0.5s)
        if (audioBlob.size < 100) {
          onTextFallbackRequired("Recording was too short. Please speak clearly.");
          return;
        }

        onAudioReady(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      let errMsg = "Microphone access denied. Please type your query.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = "Microphone permission was denied. Please enable it in browser settings or type instead.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = "No microphone found on your device. Please type instead.";
      }
      setPermissionError(errMsg);
      onTextFallbackRequired(errMsg);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Temporarily override onstop to discard chunks
      mediaRecorderRef.current.onstop = () => {
        const stream = mediaRecorderRef.current?.stream;
        stream?.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTimer(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!browserSupported) {
    return (
      <div style={{
        padding: '12px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-elevated)',
        textAlign: 'center',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)'
      }}>
        🎙️ Voice recording is not supported in this browser. Please type your query in the input bar.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
      {permissionError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          background: 'var(--emergency-bg)',
          color: 'var(--emergency)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          width: '100%',
          border: '1px solid rgba(220,38,38,0.2)'
        }} className="animate-fade-in">
          <AlertCircle size={16} />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Button Controls Panel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        {isRecording ? (
          <>
            {/* Cancel Button */}
            <button 
              onClick={handleCancelRecording}
              className="btn btn-outline"
              style={{
                borderRadius: '50%',
                width: '46px',
                height: '46px',
                padding: 0,
                minHeight: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: 'var(--border)'
              }}
              title="Cancel Recording"
            >
              <X size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>

            <button 
              onClick={handleStopRecording}
              className="btn animate-pulse"
              style={{
                borderRadius: '50%',
                width: '68px',
                height: '68px',
                padding: 0,
                minHeight: '68px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--emergency)',
                color: '#ffffff',
                boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.7)',
                position: 'relative'
              }}
              title="Stop Recording"
            >
              <Square size={24} fill="#ffffff" />
            </button>

            {/* Timer Counter */}
            <span style={{ 
              fontWeight: 800, 
              fontSize: '1rem', 
              color: 'var(--emergency)',
              minWidth: '40px'
            }}>
              {formatTime(timer)}
            </span>
          </>
        ) : (
          <button 
            onClick={handleStartRecording}
            className="btn btn-primary"
            style={{
              borderRadius: 'var(--radius-xl)',
              padding: '14px 28px',
              fontSize: '1rem',
              fontWeight: 800,
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: 'var(--shadow-md)',
              opacity: isLoading ? 0.7 : 1
            }}
            disabled={isLoading}
          >
            <Mic size={20} />
            {isLoading ? "Understanding..." : "Tap & Speak"}
          </button>
        )}

      </div>
      
      {isRecording && (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          🎙️ Listening... Speak clearly in Kannada, English, or Hindi
        </span>
      )}
    </div>
  );
};
