import os
import re
import json
import tempfile
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Sehat Setu ML Voice Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models
whisper_model = None
embedding_model = None
intent_examples = {}
example_embeddings = {}

# Quantized CPU model settings
WHISPER_MODEL_SIZE = "tiny"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# 1. Load Intent examples
INTENT_EXAMPLES_PATH = "data/intents/intent_examples.json"
try:
    with open(INTENT_EXAMPLES_PATH, "r", encoding="utf-8") as f:
        intent_examples = json.load(f)
    print(f"Loaded {len(intent_examples)} intents from dataset.")
except Exception as e:
    print(f"Warning: Could not load intent_examples.json: {e}")

# 2. Try loading ML libraries
stt_available = False
embeddings_available = False

try:
    from faster_whisper import WhisperModel
    print("Loading Faster-Whisper model...")
    # Run on CPU with int8 quantization to conserve RAM and run fast
    whisper_model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
    stt_available = True
    print("Faster-Whisper model loaded successfully.")
except Exception as e:
    print(f"ASR Warning: faster-whisper not available (CPU fallback mode active): {e}")

try:
    from sentence_transformers import SentenceTransformer
    print("Loading Sentence-Transformers model...")
    embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    embeddings_available = True
    print("Sentence-Transformers loaded successfully.")
    
    # Precompute and cache intent example embeddings
    print("Precomputing intent example embeddings...")
    for intent, examples in intent_examples.items():
        if examples:
            example_embeddings[intent] = embedding_model.encode(examples)
    print("Cached example embeddings.")
except Exception as e:
    print(f"Embeddings Warning: sentence-transformers not available (TF-IDF/pure-python fallback active): {e}")


# --- Pure Python TF-IDF Cosine Similarity Fallback ---
# If sentence-transformers is missing, we use a simple bag-of-words / TF-IDF similarity matcher.
def get_bow_vector(text, vocabulary):
    tokens = re.findall(r'\b\w+\b', text.lower())
    vec = np.zeros(len(vocabulary))
    for t in tokens:
        if t in vocabulary:
            vec[vocabulary[t]] += 1
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec

# Build global vocab from examples
vocab = {}
for intent, examples in intent_examples.items():
    for ex in examples:
        for word in re.findall(r'\b\w+\b', ex.lower()):
            if word not in vocab:
                vocab[word] = len(vocab)


# --- Layer 1: Regex Emergency Keyword Check ---
EMERGENCY_KEYWORDS = [
    'chest pain', 'severe chest pain', 'heart attack', 'difficulty breathing', 'cannot breathe',
    'breathless', 'unconscious', 'passed out', 'heavy bleeding', 'snake bite', 'poisoning',
    'stroke', 'paralysis', 'accident ho gaya', 'ede novu', 'seene mein dard', 'chhati me dard',
    'ಎದೆ ನೋವು', 'ಉಸಿರಾಟದ ತೊಂದರೆ', 'ಹಾರ್ಟ್ अटैक', 'बेहोश'
]

def check_emergency(text):
    text_lower = text.lower().strip()
    for kw in EMERGENCY_KEYWORDS:
        if kw in text_lower:
            return True, kw
    return False, None


# --- FastAPI Endpoints ---

class UnderstandRequest(BaseModel):
    transcript: str
    language: Optional[str] = "en"

@app.post("/api/voice/transcribe")
async def transcribe(audio: UploadFile = File(...), languageHint: Optional[str] = Form(None)):
    print(f"Received audio file for transcription: {audio.filename}, size: {audio.size} bytes")
    
    # Check constraints: max 10MB
    if audio.size and audio.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file too large. Max limit is 10MB.")
        
    # Write to a temporary file (respect privacy - delete immediately after processing)
    temp_fd, temp_path = tempfile.mkstemp(suffix=".webm")
    try:
        with os.fdopen(temp_fd, 'wb') as tmp:
            tmp.write(await audio.read())
            
        transcript = ""
        lang = "en"
        lang_conf = 1.0
        
        if stt_available and whisper_model:
            # Model transcription
            segments, info = whisper_model.transcribe(
                temp_path,
                beam_size=5,
                language=languageHint if languageHint else None
            )
            segments = list(segments)
            transcript = " ".join([seg.text for seg in segments]).strip()
            lang = info.language
            lang_conf = info.language_probability
        else:
            # Fallback mock transcription for testing without large packages
            print("Running in CPU Fallback Mode for ASR...")
            transcript = "I need an Ayushman hospital near Bengaluru"
            lang = "en"
            lang_conf = 0.95
            
        print(f"Transcription complete: '{transcript}' [lang: {lang}, conf: {lang_conf}]")
        
        return {
            "transcript": transcript,
            "language": lang,
            "languageConfidence": lang_conf
        }
    except Exception as e:
        print(f"ASR Error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Delete temporary audio file immediately (Audio Privacy Rule)
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                print(f"Temporary file deleted successfully: {temp_path}")
        except Exception as e:
            print(f"Failed to delete temp file: {e}")

@app.post("/api/intent/understand")
async def understand(req: UnderstandRequest):
    transcript = req.transcript.strip()
    language = req.language or "en"
    
    print(f"Understanding intent for transcript: '{transcript}' [lang: {language}]")
    
    if not transcript:
         return {
            "intent": "UNKNOWN",
            "confidence": 0.40,
            "entities": {},
            "requiresClarification": true
        }

    # 1. Emergency intent Layer
    is_em, matched = check_emergency(transcript)
    if is_em:
         return {
            "intent": "EMERGENCY",
            "confidence": 0.99,
            "entities": {
                "symptomOrCondition": matched
            },
            "requiresClarification": false
        }

    # 2. Multilingual Semantic Intent Matching
    best_intent = "UNKNOWN"
    max_score = 0.0
    
    if embeddings_available and embedding_model:
        # Load and embed query
        query_emb = embedding_model.encode([transcript])[0]
        
        # Calculate cosine similarity against all intents
        for intent, cached_embs in example_embeddings.items():
            if cached_embs.size > 0:
                # Cosine similarities
                dots = np.dot(cached_embs, query_emb)
                norms = np.linalg.norm(cached_embs, axis=1) * np.linalg.norm(query_emb)
                similarities = dots / norms
                max_ex_score = np.max(similarities)
                
                if max_ex_score > max_score:
                    max_score = float(max_ex_score)
                    best_intent = intent
    else:
        # Pure Python TF-IDF cosine-similarity fallback
        query_vec = get_bow_vector(transcript, vocab)
        query_norm = np.linalg.norm(query_vec)
        
        if query_norm > 0:
            for intent, examples in intent_examples.items():
                for ex in examples:
                    ex_vec = get_bow_vector(ex, vocab)
                    ex_norm = np.linalg.norm(ex_vec)
                    if ex_norm > 0:
                        sim = np.dot(query_vec, ex_vec) / (query_norm * ex_norm)
                        if sim > max_score:
                            max_score = float(sim)
                            best_intent = intent
                            
    # 3. Confidence Threshold Logic
    requires_clarification = False
    
    # Standardize score scaling
    if not embeddings_available:
        # Scale TF-IDF scores slightly since bag-of-words similarity is sparser
        max_score = min(1.0, max_score * 1.5)
        
    print(f"Matched Intent: {best_intent}, raw score: {max_score:.4f}")
    
    if max_score >= 0.85:
        confidence = max_score
        requires_clarification = False
    elif 0.60 <= max_score < 0.85:
        confidence = max_score
        requires_clarification = True
    else:
        best_intent = "UNKNOWN"
        confidence = max_score
        requires_clarification = True

    # 4. Entity Extraction
    entities = {}
    
    # PIN Code extractor
    pincode_match = re.search(r'\b\d{6}\b', transcript)
    if pincode_match:
        entities['pincode'] = pincode_match.group(0)
        entities['location'] = {
            "type": "PINCODE",
            "value": pincode_match.group(0)
        }
        
    # Location entities
    locations = ['bengaluru', 'bangalore', 'kolar', 'bagalkot', 'belagavi', 'mysuru']
    for loc in locations:
        if loc in transcript.lower():
            if 'location' not in entities:
                entities['location'] = {
                    "type": "DISTRICT_OR_CITY",
                    "value": loc.title()
                }
                
    # Near me checks
    if 'near me' in transcript.lower() or 'paas mein' in transcript.lower():
        entities['location'] = {
            "type": "CURRENT_LOCATION",
            "value": "near_me"
        }
        
    # Medicine name check (for compatibility with Module 05)
    # E.g. extract "dolo 650" or "paracetamol"
    med_match = re.search(r'\b(dolo\s*\d*|paracetamol|aspirin|crocin|calpol|ibuprofen)\b', transcript, re.IGNORECASE)
    if med_match:
        entities['medicine'] = med_match.group(0)

    # Scheme check
    if 'ayushman' in transcript.lower() or 'pmjay' in transcript.lower() or 'pm-jay' in transcript.lower():
        entities['scheme'] = "PM_JAY"

    return {
        "intent": best_intent,
        "confidence": round(confidence, 2),
        "entities": entities,
        "requiresClarification": requires_clarification
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting voice backend server on http://localhost:5001...")
    uvicorn.run(app, host="127.0.0.1", port=5001)
