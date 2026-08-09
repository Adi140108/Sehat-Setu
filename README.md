# SEHAT SETU (सेहत सेतु)
### *"Healthcare access should not depend on knowing where to look."*

Sehat Setu is a multilingual, voice-first healthcare access and government health-scheme navigation platform for underserved communities in India.

> **PRIMARY DIFFERENTIATOR & PHILOSOPHY:**
> *"ROUTE, DON'T DIAGNOSE."*
> Sehat Setu does not try to replace doctors with AI. It helps citizens move from "I don't know where to go" to "I know exactly what to do next."

---

## 🚀 Key Features

1. **Multilingual Voice-First Interface**
   - Built-in speech-to-text (STT) and text-to-speech (TTS) supporting **English**, **Hindi (हिन्दी)**, **Kannada (ಕನ್ನಡ)**, **Tamil (தமிழ்)**, **Telugu (తెలుగు)**, and **Marathi (मराठी)**.

2. **High-Priority Red Emergency Safety Path**
   - Instantly intercepts emergency high-risk phrases (chest pain, unconscious, snake bite, severe trauma).
   - Displays a visually distinct Red Emergency View with a 108 Call dialer and nearest trauma facilities.

3. **Deterministic Rule-Based Health Scheme Engine**
   - Evaluates PM-JAY (Ayushman Bharat), Ayushman Vaya Vandana (70+ Senior Citizens), Jan Aushadhi (PMBJP), and State Schemes without LLM hallucination.
   - Provides preliminary eligibility badges and required document checklists (Aadhaar, Ration Card).

4. **Verified Facility Locator & Interactive Leaflet Maps**
   - Searches PM-JAY empanelled hospitals, Jan Aushadhi Kendras, Primary Health Centres (PHCs), CHCs, and Government Hospitals.
   - Sorts facilities by spatial GPS distance (Haversine formula) with pincode/city fallback.

5. **Community Support & ASHA Volunteer Desk**
   - Allows low-literacy citizens to request human handoff from local ASHA workers or NGO volunteers.

6. **WhatsApp Integration Simulator**
   - Decoupled `MessageChannel` architecture with an interactive smartphone simulator UI for testing WhatsApp audio & text webhooks.

7. **Privacy by Design & Anonymized Analytics**
   - Strictly no raw voice file storage or medical diagnosis data retention.
   - Citizen data deletion feature ("Delete My Data").
   - Protected Admin Dashboard featuring anonymized aggregate metrics.

---

## 🛠️ Tech Stack

- **Frontend**: Vite, React, TypeScript
- **Styling**: Modern CSS Design Tokens, Light/Dark & High Contrast Accessibility Modes
- **Icons**: `lucide-react`
- **Maps**: Leaflet & `react-leaflet` (OpenStreetMap tile layer - 100% free)
- **Backend & Database**: Firebase Auth, Firebase Firestore + Hybrid Offline Storage Engine
- **Voice Synthesis & STT**: Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)

---

## 📦 How to Run the Project

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Launch

```bash
# 1. Clone or navigate to directory
cd "Sehat Setu"

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🧪 Hackathon Demo Scenario Bar

The top navigation bar features 4 instant **Demo Triggers** for rapid hackathon presentation:
- **Demo 1: Hindi Voice Search**: Runs sample Hindi audio query *"Mujhe paas mein sarkari hospital chahiye"*.
- **Demo 2: Emergency (Red)**: Demonstrates the emergency alert path for *"Mere seene mein bahut dard ho raha hai"*.
- **Demo 3: Scheme & Docs**: Evaluates senior citizen scheme rules and document checklists.
- **Demo 4: ASHA Handoff**: Demonstrates community support request workflow.

---

## 📁 Project Structure

```
src/
├── types/                # TypeScript interface definitions
├── locales/              # Multilingual translations (EN, HI, KN, TA, TE, MR)
├── data/                 # Verified facility & scheme seed datasets
├── services/
│   ├── firebase/         # Auth & Firestore database services
│   ├── ai/               # Intent classifier & Emergency safety detector
│   ├── facilities/       # Distance search & filtering
│   ├── schemes/          # Rule-based eligibility engine
│   ├── voice/            # Speech-to-text & Text-to-speech wrappers
│   └── messaging/        # MessageChannel & WhatsApp simulator
├── contexts/             # Auth, Language, & Theme providers
├── components/
│   ├── common/           # Header, DemoBanner, PrivacyNotice
│   ├── citizen/          # Citizen Home, Voice UI, Facilities, Schemes, Emergency
│   ├── admin/            # Admin Analytics Dashboard
│   ├── volunteer/        # ASHA / Volunteer Desk
│   └── whatsapp/         # WhatsApp Smartphone Simulator
├── App.tsx               # Root App component
└── main.tsx              # Entry point
```

---

## 📜 License & Compliance

Developed as a public-service hackathon prototype. All facility datasets and scheme rules are verified against official Government of India open health portals (MoHFW, PM-JAY, PMBI).
