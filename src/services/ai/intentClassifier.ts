import type { IntentResult, LanguageCode } from '../../types';
import { classifyIntentLocal } from './intentClassifierLocal';

/**
 * Main Intent Classifier Entrypoint
 * Dispatches to Python backend if online, or falls back to local TS hybrid classifier.
 */
export async function classifyIntent(userText: string, currentLang: LanguageCode = 'en'): Promise<IntentResult> {
  // Simple guard for empty input
  if (!userText || !userText.trim()) {
    return {
      category: 'UNKNOWN',
      confidence: 0.40,
      isEmergency: false,
      language: currentLang,
      extractedEntities: {},
      requiresClarification: true
    };
  }

  try {
    const response = await fetch('/api/intent/understand', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript: userText,
        language: currentLang
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data as IntentResult;
    }
  } catch (err) {
    // Fail silently and use local edge hybrid classifier
  }
  
  // Client-side local hybrid classifier fallback (Layer 1 Keyword + Layer 2 TF-IDF Cosine Similarity)
  return classifyIntentLocal(userText, currentLang);
}
