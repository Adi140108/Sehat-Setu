import type { LanguageCode } from '../../types';
import { LANG_BCP47_MAP } from './speechToText';

export class TextToSpeechService {
  private synth: SpeechSynthesis | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      
      // Chrome loads voices asynchronously — pre-cache them on load
      this.cachedVoices = this.synth.getVoices();

      // Listen for the voiceschanged event (fires when voices finish loading)
      this.synth.addEventListener('voiceschanged', () => {
        this.cachedVoices = this.synth!.getVoices();
      });
    }
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  private findBestVoice(targetLang: string): SpeechSynthesisVoice | null {
    const voices = this.cachedVoices.length > 0 
      ? this.cachedVoices 
      : (this.synth?.getVoices() || []);

    // 1. Exact locale match (e.g. "hi-IN")
    let voice = voices.find(v => v.lang.toLowerCase() === targetLang.toLowerCase());
    
    // 2. Prefix match (e.g. "hi")
    if (!voice) {
      const prefix = targetLang.split('-')[0].toLowerCase();
      voice = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    }
    
    // 3. For Hindi specifically, also try "hi" without region
    if (!voice && targetLang.startsWith('hi')) {
      voice = voices.find(v => v.lang.toLowerCase() === 'hi');
    }

    return voice || null;
  }

  public speak(text: string, language: LanguageCode, onEnd?: () => void) {
    if (!this.synth || !text) return;

    this.stop(); // Stop any active speech

    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = LANG_BCP47_MAP[language] || 'hi-IN';
    utterance.lang = targetLang;
    utterance.rate = 0.88;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find and bind a native voice for the target language
    const matchedVoice = this.findBestVoice(targetLang);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }

    // Chrome has a known bug where long utterances stop mid-sentence.
    // Workaround: resume synthesis periodically.
    const resumeInterval = setInterval(() => {
      if (this.synth && this.synth.speaking) {
        this.synth.resume();
      } else {
        clearInterval(resumeInterval);
      }
    }, 10000);

    utterance.onend = () => {
      clearInterval(resumeInterval);
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      clearInterval(resumeInterval);
    };

    this.synth.speak(utterance);
  }

  public stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
  }
}

export const ttsService = new TextToSpeechService();
