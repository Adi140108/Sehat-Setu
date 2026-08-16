import type { LanguageCode } from '../../types';

// Map Sehat Setu language codes to Web Speech BCP 47 locale codes
export const LANG_BCP47_MAP: Partial<Record<LanguageCode, string>> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN'
};

export interface STTCallbacks {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export class SpeechToTextService {
  private recognition: any = null;
  private isListening: boolean = false;

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public start(language: LanguageCode, callbacks: STTCallbacks): boolean {
    if (!this.recognition) {
      callbacks.onError('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Android Browser.');
      return false;
    }

    if (this.isListening) {
      this.stop();
    }

    this.recognition.lang = LANG_BCP47_MAP[language] || 'hi-IN';

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      callbacks.onResult(text, !!finalTranscript);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      callbacks.onError(event.error || 'Voice input error');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      callbacks.onEnd();
    };

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (err) {
      this.isListening = false;
      callbacks.onError('Failed to start microphone');
      return false;
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        // ignore
      }
      this.isListening = false;
    }
  }
}

export const sttService = new SpeechToTextService();
