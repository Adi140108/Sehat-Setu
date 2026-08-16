import re
import json
import numpy as np

# Load test cases and intent examples
TEST_CASES_PATH = "data/voice_tests/intent_test_cases.json"
INTENT_EXAMPLES_PATH = "data/intents/intent_examples.json"

try:
    with open(TEST_CASES_PATH, "r", encoding="utf-8") as f:
        test_cases = json.load(f)
    with open(INTENT_EXAMPLES_PATH, "r", encoding="utf-8") as f:
        intent_examples = json.load(f)
except Exception as e:
    print(f"Error loading datasets: {e}")
    exit(1)

# Build vocab
vocab = {}
for intent, examples in intent_examples.items():
    for ex in examples:
        for word in re.findall(r'\b\w+\b', ex.lower()):
            if word not in vocab:
                vocab[word] = len(vocab)

def get_bow_vector(text):
    tokens = re.findall(r'\b\w+\b', text.lower())
    vec = np.zeros(len(vocab))
    for t in tokens:
        if t in vocab:
            vec[vocab[t]] += 1
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec

# Precompute examples
example_vectors = []
for intent, examples in intent_examples.items():
    for ex in examples:
        vec = get_bow_vector(ex)
        if np.linalg.norm(vec) > 0:
            example_vectors.append((intent, vec))

# Layer 1 Emergency check
EMERGENCY_KEYWORDS = [
    # English
    'chest pain', 'severe chest pain', 'heart attack', 'difficulty breathing', 'cannot breathe',
    'breathless', 'unconscious', 'passed out', 'heavy bleeding', 'snake bite', 'poisoning',
    'stroke', 'paralysis', 'severe allergic reaction', 'major accident', 'head injury',
    'severe trauma', 'pregnancy emergency', 'labor pain', 'high risk labor',

    # Hindi & Hindi Transliteration
    'seene mein dard', 'chhati me dard', 'saans nahi aa rahi', 'saans lene me dikkat',
    'behosh', 'khoon beh raha', 'saanp ne kata', 'saap ne kaata', 'zehar', 'poison',
    'accident ho gaya', 'chot lag gayi', 'garbhavastha emergency', 'prasav dard',
    'सीना दर्द', 'छाती में दर्द', 'सांस नहीं आ रही', 'बेहोश', 'खून बह रहा है', 'सांप काटा', 'हार्ट अटैक',

    # Kannada & Kannada Transliteration
    'ede nova', 'ede novu', 'usirata tondare', 'kettoda', 'behosh', 'apaghata',
    'ಎದೆ ನೋವು', 'ಉಸಿರಾಟದ ತೊಂದರೆ', 'ಪ್ರಜ್ಞೆ ತಪ್ಪಿದೆ', 'ರಕ್ತಸ್ರಾವ', 'ಹಾವು ಕಡಿತ', 'ಅಪಘಾತ',

    # Tamil & Tamil Transliteration
    'nenju vali', 'moochu thinaral', 'adhibabar', 'vibathu', 'ratham',
    'நெஞ்சு வலி', 'மூச்சுத் திணறல்', 'மயக்கம்', 'இரத்தப்போக்கு', 'பாம்பு கடி', 'விபத்து',

    # Telugu & Telugu Transliteration
    'gunde noppi', 'usiri adadam ledu', 'padi poyadu', 'pramadham',
    'గుండె నొప్పి', 'శ్వాస తీసుకోవడం కష్టం', 'స్పృహ తప్పడం', 'రक्तस्रावं', 'పాము కాటు', 'ప్రమాదం',

    # Marathi & Marathi Transliteration
    'chatit dukhne', 'shwas ghenyas tras', 'behosh', 'rakta strav', 'sap chawala',
    'छातीत दुखणे', 'श्वास घेण्यास त्रास', 'बेहोश', 'रक्तस्त्राव', 'साप चावला', 'अपघात'
]

def check_emergency(text):
    text_lower = text.lower().strip()
    for kw in EMERGENCY_KEYWORDS:
        if kw in text_lower:
            return True
    return False

def classify(text):
    if check_emergency(text):
        return "EMERGENCY", 0.99, False
        
    query_vec = get_bow_vector(text)
    query_norm = np.linalg.norm(query_vec)
    if query_norm == 0:
        return "UNKNOWN", 0.40, True
        
    best_intent = "UNKNOWN"
    max_score = 0.0
    
    for intent, ex_vec in example_vectors:
        sim = np.dot(query_vec, ex_vec)
        if sim > max_score:
            max_score = sim
            
    # Scale sparse TF-IDF score
    confidence = min(1.0, max_score * 1.6)
    
    requires_clarification = False
    if confidence >= 0.85:
        requires_clarification = False
    elif confidence >= 0.60:
        requires_clarification = True
    else:
        best_intent = "UNKNOWN"
        requires_clarification = True
        
    if confidence >= 0.60:
        # Find best intent category
        best_intent = "UNKNOWN"
        max_intent_score = 0.0
        for intent, ex_vec in example_vectors:
            sim = np.dot(query_vec, ex_vec)
            if sim > max_intent_score:
                max_intent_score = sim
                best_intent = intent
                
    return best_intent, confidence, requires_clarification

# Run evaluation
correct = 0
total = len(test_cases)
clarification_count = 0
unknown_count = 0

emergency_true_pos = 0
emergency_false_pos = 0
emergency_true_neg = 0
emergency_false_neg = 0

results = []

for case in test_cases:
    text = case["text"]
    expected = case["expectedIntent"]
    
    pred_intent, conf, req_clarify = classify(text)
    
    is_correct = (pred_intent == expected)
    if is_correct:
        correct += 1
    if req_clarify:
        clarification_count += 1
    if pred_intent == "UNKNOWN":
        unknown_count += 1
        
    # Emergency confusion matrix
    is_expected_em = (expected == "EMERGENCY")
    is_pred_em = (pred_intent == "EMERGENCY")
    
    if is_expected_em and is_pred_em:
        emergency_true_pos += 1
    elif not is_expected_em and is_pred_em:
        emergency_false_pos += 1
    elif not is_expected_em and not is_pred_em:
        emergency_true_neg += 1
    elif is_expected_em and not is_pred_em:
        emergency_false_neg += 1
        
    results.append({
        "text": text,
        "expected": expected,
        "predicted": pred_intent,
        "confidence": round(conf, 2),
        "correct": is_correct,
        "clarify": req_clarify
    })

accuracy = correct / total
clarify_rate = clarification_count / total
unknown_rate = unknown_count / total

print("=== INTENT ENGINE LOCAL EVALUATION REPORT ===")
print(f"Total Test Cases: {total}")
print(f"Overall Classification Accuracy: {accuracy * 100:.2f}%")
print(f"Clarification Trigger Rate: {clarify_rate * 100:.2f}%")
print(f"UNKNOWN Intent Rate: {unknown_rate * 100:.2f}%")
print("\n--- Emergency Safety Performance ---")
print(f"  True Positives (Emergency correctly routed): {emergency_true_pos}")
print(f"  False Positives (Non-emergency routed to 108): {emergency_false_pos}")
print(f"  False Negatives (Emergency missed!): {emergency_false_neg}")
print(f"  Emergency Detection Accuracy: {(emergency_true_pos + emergency_true_neg) / total * 100:.2f}%")

# Save detailed evaluation report
eval_report = {
    "summary": {
        "total_test_cases": total,
        "accuracy": round(accuracy, 4),
        "clarification_rate": round(clarify_rate, 4),
        "unknown_rate": round(unknown_rate, 4),
        "emergency_metrics": {
            "true_positives": emergency_true_pos,
            "false_positives": emergency_false_pos,
            "false_negatives": emergency_false_neg,
            "accuracy": round((emergency_true_pos + emergency_true_neg) / total, 4)
        }
    },
    "details": results
}

with open("data/voice_tests/intent_evaluation_report.json", "w", encoding="utf-8") as f:
    json.dump(eval_report, f, indent=2)
print("\nSaved detailed report to: data/voice_tests/intent_evaluation_report.json")
