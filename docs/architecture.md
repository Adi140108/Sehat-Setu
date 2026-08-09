# Sehat Setu — Technical Architecture

## Core Product Principle
> **"ROUTE, DON'T DIAGNOSE."**
> Sehat Setu acts as a voice-first healthcare navigation layer connecting citizens to existing public health infrastructure (PM-JAY, Jan Aushadhi Kendras, PHCs, CHCs, Government Hospitals) without attempting medical diagnosis or drug prescriptions.

---

## High-Level System Workflow

```
[ Citizen Input ] (Voice or Text in Hindi, Kannada, Tamil, Telugu, Marathi, English)
        │
        ▼
[ Multilingual Voice STT Layer ] (Web Speech API / Native Audio Processing)
        │
        ▼
[ Safety & Emergency Detector ] ──(High-Risk Trigger)──► [ RED EMERGENCY VIEW ]
        │                                                - Call 108 Button
(Safe Navigation Query)                                  - Nearest Trauma Center
        │                                                - NO Diagnosis
        ▼
[ Structured Intent Classifier ]
   ├── FIND_FACILITY ──────────► [ Spatial Haversine Distance Search + Leaflet Map ]
   ├── CHECK_SCHEME ───────────► [ Deterministic Rule Engine (PM-JAY, Ayushman 70+) ]
   ├── DOCUMENT_REQUIREMENTS ──► [ Aadhaar / Ration Card Checklist Generator ]
   ├── HUMAN_SUPPORT ──────────► [ ASHA Worker / Volunteer Desk Inbox ]
   └── FOLLOW_UP ──────────────► [ Referral Visit Outcome Verification ]
        │
        ▼
[ Privacy-First Analytics Aggregator ] (Anonymized Aggregate Metrics)
```

---

## Messaging Channel Abstraction

Sehat Setu decouples messaging interfaces using a unified `MessageChannel` contract:

- **`WebChannel`**: Drives the responsive web client.
- **`WhatsAppChannel`**: Powers the WhatsApp Webhook integration, complete with an interactive smartphone simulator UI for hackathon demonstrations.
