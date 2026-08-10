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
    const targetLang = LANG_BCP47_MAP[language] || 'hi-IN';
    utterance.lang = targetLang;
    utterance.rate = 0.90; // Slower rate for clear pronunciation in local languages
    utterance.pitch = 1.0;

    // Load available voices and find a match for the target locale/language
    const voices = this.synth.getVoices();
    
    // 1. Try to find exact locale match (e.g. "hi-IN" or "ta-IN")
    let voice = voices.find(v => v.lang.toLowerCase() === targetLang.toLowerCase());
    
    // 2. Try prefix match (e.g. "hi" or "ta")
    if (!voice) {
      const prefix = targetLang.split('-')[0].toLowerCase();
      voice = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    }

    if (voice) {
      utterance.voice = voice;
      console.log(`TTS matches voice: ${voice.name} (${voice.lang})`);
    } else {
      console.warn(`No native voice found for ${targetLang}, defaulting to system fallback.`);
    }

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
