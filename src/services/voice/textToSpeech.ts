import type { LanguageCode } from '../../types';
import { LANG_BCP47_MAP } from './speechToText';

export class TextToSpeechService {
  private synth: SpeechSynthesis | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  public speak(text: string, language: LanguageCode, onEnd?: () => void) {
    if (!this.synth) return;

    this.stop(); // Stop any active speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_BCP47_MAP[language] || 'hi-IN';
    utterance.rate = 0.95; // Slightly slower for clarity in rural healthcare setting
    utterance.pitch = 1.0;

    if (onEnd) {
      utterance.onend = onEnd;
    }

    this.synth.speak(utterance);
  }

  public stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
  }
}

export const ttsService = new TextToSpeechService();
