# MatruRaksha (मातृरक्षा) — Intelligent Maternal Care OS & Clinical Surveillance

[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Gemini 3.8 Flash](https://img.shields.io/badge/AI-Gemini%203.8%20Flash-4285F4?style=flat&logo=google)](https://aistudio.google.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFA611?style=flat&logo=firebase)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://www.python.org/)

**MatruRaksha** is an end-to-end, life-critical maternal healthcare monitoring and clinical surveillance platform developed for the **Google Developer Groups (GDG) Hackathon** by **Team Code Alchemists**.

The platform bridges frontline community **ASHA workers**, hospital **supervisors/doctors**, and **expectant mothers** under a unified, real-time operating system. It combines Machine Learning risk prediction, deterministic **Ministry of Health & Family Welfare (MoHFW)** protocols, multi-visit trajectory tracking, and native bilingual **Gemini 3.8 Flash** voice advisories.

---

##  Key Highlights & Core Capabilities

- **Zero Mock Data & Clean Database State**: Starts 100% unseeded. Data enters purely through live registrations, clinical antenatal checkups, and bulk CSV/JSON dataset imports.
- **3-Layer Clinical Risk Engine**:
  1. *Layer 1 (ML Risk Adapter)*: Evaluates the 6 standardized maternal features (`Age`, `SystolicBP`, `DiastolicBP`, `BS`, `BodyTemp`, `HeartRate`) using a Random Forest classifier (`rf_model.joblib` or calibrated fallback).
  2. *Layer 2 (MoHFW Clinical Protocols)*: Enforces deterministic clinical rules for Severe Anemia ($Hb < 9.0\text{ g/dL}$), Moderate Anemia ($9.0 \le Hb < 11.0\text{ g/dL}$), Fetal Distress ($FHR < 110$ or $> 160\text{ bpm}$ / reduced movements), Hypertensive Crisis ($\ge 140/90\text{ mmHg}$), and Pyrexia.
  3. *Layer 3 (Longitudinal Multi-Visit Trajectory)*: Analyzes historical visit progressions to flag creeping blood pressure or gestational diabetes trends and generates explainability alert badges.
- **Bilingual Gemini 3.8 Flash & Native Audio Advisory**:
  - Generates structured, empathetic clinical justifications in both Hindi and English.
  - Synthesizes native Hindi voice advisories via TTS (`audio_base64`) for illiterate or low-literacy rural mothers.
  - Generates 5-visit clinical trajectory summaries for medical officers.
- **Role-Based Phone + OTP Authentication**:
  - Firebase Phone Authentication (`RecaptchaVerifier` + `signInWithPhoneNumber`) with instant backend OTP fallback (`/auth/send-otp` & `/auth/verify-otp`) to guarantee login even without SMS credit.
  - Role selection for **Medical Officer / Supervisor**, **ASHA Field Worker**, and **Expectant Mother**.
- **Offline Field Synchronization**:
  - Frontline ASHA workers can record visits in low-connectivity rural areas. Visits are queued in browser `localStorage` and synchronized in one click via `syncOfflineQueue()`.
- **National Health Mission (NHM) Integration**:
  - Tracks Iron Folic Acid (IFA) tablets, Calcium supplementation, Tetanus Diphtheria (TD) vaccination, and weight gain tracking.
- **108 ALS Emergency Dispatch Referral**:
  - One-tap emergency ambulance dispatch logging with FRU hospital routing and vital condition triage.

---

## 📱 Three Dedicated Stakeholder Experiences

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MatruRaksha Architecture                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    Supervisor    │       │   ASHA Worker    │       │ Expectant Mother │
│    Dashboard     │       │ Companion App    │       │  Companion App   │
│       (/)        │       │     (/asha)      │       │    (/mother)     │
└────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │     FastAPI Clinical Gateway (Uvicorn / Port 8000)       │
       ├──────────────────────────────────────────────────────────┤
       │ • 3-Layer Clinical Risk Engine (ML + MoHFW + Trends)     │
       │ • Gemini 3.8 Flash Bilingual Advisor & Hindi TTS         │
       │ • Dual Storage: Google Cloud Firestore + Memory Fallback │
       │ • 108 ALS Ambulance Dispatch Logger & Bulk CSV Importer  │
       └──────────────────────────────────────────────────────────┘
```

### 1. Supervisor / Medical Officer Dashboard (`/`)
- **Operational KPI Grid**: Live counts for Total Registered Mothers, High-Risk Cases, Active ASHA Workers, and Overdue ANC Visits.
- **Epidemiological Breakdown**: Visual distribution of caseload across gestational trimesters and village clusters.
- **Clinical Surveillance Cohort**: Searchable, filterable mother registry with risk badges (`HIGH`, `MODERATE`, `LOW`).
- **Bulk Dataset Import**: One-click import of clinical datasets (`.csv` or `.json`) directly to `POST /mothers/bulk-import`.
- **Export CSV**: Instant export of registered mothers and clinical data for district health reporting.
- **Deep Clinical Trajectory Modal**: Longitudinal visit table, explainability alert badges, and AI 5-visit clinical progression summaries.

### 2. ASHA Field Worker Companion (`/asha`)
- **Mobile-First Field Design**: Optimized for touch-screen mobile devices used by frontline health workers.
- **Offline Visit Caching**: Records antenatal encounters offline; badges show pending queue count.
- **One-Click Sync**: Flushes all queued visits to `POST /evaluate-visit` with immediate AI triage.
- **Record ANC Visit Modal**: Intake for the 6 ML features + Hemoglobin, FHR, Fetal Movement, IFA/Calcium issuance, and TD vaccination.
- **Instant AI Triage Feedback**: Displays live risk badge, clinical reasoning in Hindi/English, and audio playback immediately after submitting a visit.
- **Direct Emergency SOS Dispatch**: Rapidly referral to 108 Emergency Medical Services.

### 3. Expectant Mother Pregnancy Companion (`/mother`)
- **Reassuring Maternal Health View**: Displays gestational week, trimester stage, and countdown to Estimated Due Date (EDD).
- **Live Vitals Monitoring**: Displays latest Blood Pressure, Blood Sugar, Hemoglobin, Heart Rate, Body Temperature, and Weight.
- **Bilingual Hindi Audio Player**: Native voice advisory from ASHA Didi with audio waveform visualization and English translation toggle.
- **Daily Care Routine Checklist**: Interactive checkboxes for nutritious diet, IFA tablet intake, 3L hydration, and fetal kick count, persistently saved via `PUT /mothers/{id}/tasks`.
- **Emergency Call Button**: Instant 108 ambulance dispatch and helpline trigger.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | **Next.js 16.4.3** (Turbopack, App Router), **React 19**, **TypeScript** |
| **Styling & Icons** | **Tailwind CSS**, **Lucide React**, Custom Maternal Design System |
| **Client State & Auth**| **React Context API**, **Firebase JS SDK 12+** (`auth`, `analytics`) |
| **Backend Framework** | **FastAPI 0.110+**, **Uvicorn**, **Pydantic v2** |
| **Generative AI & Audio** | **Gemini 3.8 Flash** (`google-genai`), **Google Cloud Text-to-Speech** |
| **Machine Learning** | **Scikit-Learn**, **Joblib**, Random Forest UCI Maternal Health Classifier |
| **Database & Storage** | **Google Cloud Firestore** (`firebase-admin`), In-Memory Fallback Driver |
| **Testing & Quality** | **Pytest** (100% test pass rate), Strict TypeScript compilation |

---

## 📡 Complete REST API Reference

The backend exposes an interactive OpenAPI Swagger UI at `http://localhost:8000/docs`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check, AI status, model status, and database mode |
| `POST` | `/auth/send-otp` | Sends or generates a 6-digit phone verification OTP |
| `POST` | `/auth/verify-otp` | Verifies phone OTP, creates/retrieves user, and sets role |
| `GET` | `/mothers` | Retrieves all registered mothers with risk levels and vitals |
| `POST` | `/mothers` | Registers a new expectant mother |
| `POST` | `/mothers/bulk-import` | Bulk imports patient records from external CSV or JSON datasets |
| `GET` | `/mothers/{id}` | Retrieves a single mother's details and longitudinal visit history |
| `PUT` | `/mothers/{id}/tasks` | Updates daily checklist tasks for an expectant mother |
| `POST` | `/evaluate-visit` | Evaluates ANC visit: runs 3-layer risk engine, Gemini explanation & TTS |
| `POST` | `/tts` | Synthesizes standalone Hindi audio advisory via TTS |
| `GET` | `/mother-summary/{id}` | Generates a 3-bullet bilingual trajectory summary across past visits |
| `POST` | `/sos-dispatch` | Logs an emergency 108 ambulance dispatch referral |
| `GET` | `/sos-dispatches` | Retrieves all logged emergency ambulance dispatches |

---

## 📂 Repository File Structure

```
gdg/
├── backend/
│   ├── app/
│   │   ├── data/
│   │   │   └── mohfw_protocols.json      # MoHFW clinical guidelines & alert thresholds
│   │   ├── models/
│   │   │   └── schemas.py                # Pydantic v2 data contracts
│   │   ├── services/
│   │   │   ├── ai_services.py            # Gemini 3.8 Flash bilingual & TTS integration
│   │   │   ├── db.py                     # Firestore + In-memory unseeded database
│   │   │   └── risk_engine.py            # 3-Layer Clinical Risk Engine
│   │   └── main.py                       # FastAPI application & REST routing
│   ├── tests/
│   │   └── test_pipeline.py              # End-to-end Pytest suite
│   ├── serviceAccountKey.json            # Firebase Admin SDK credentials
│   ├── Dockerfile                        # Production Dockerfile
│   ├── requirements.txt                  # Python dependencies
│   ├── .env                              # Backend environment configuration
│   └── .env.example                      # Backend environment template
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── asha/page.tsx             # ASHA Field Worker Companion Page
│   │   │   ├── mother/page.tsx           # Expectant Mother Companion Page
│   │   │   ├── layout.tsx                # App layout wrapped in AppProvider
│   │   │   └── page.tsx                  # Supervisor Surveillance Dashboard
│   │   ├── components/
│   │   │   ├── AudioAdvisoryPlayer.tsx   # HTML5 Base64 audio player with Web Speech fallback
│   │   │   ├── EmergencySosModal.tsx     # 108 ALS Ambulance dispatch modal
│   │   │   ├── Header.tsx                # Brand header, notifications & login pill
│   │   │   ├── MotherCard.tsx            # Patient card with risk badges & actions
│   │   │   ├── MotherProfileModal.tsx    # Longitudinal visit history & AI summary modal
│   │   │   ├── PhoneAuthModal.tsx        # Firebase Phone + OTP login modal
│   │   │   ├── RecordAncVisitModal.tsx   # Antenatal checkup intake form
│   │   │   ├── RegisterMotherModal.tsx   # Mother registration form
│   │   │   ├── Sidebar.tsx               # Surveillance navigation
│   │   │   ├── StatCard.tsx              # KPI metric card component
│   │   │   └── VitalsCard.tsx            # Clinical vital indicator card
│   │   ├── context/
│   │   │   └── AppContext.tsx            # Auth session, live state & offline queue
│   │   ├── lib/
│   │   │   ├── api.ts                    # REST client for FastAPI backend
│   │   │   └── firebase.ts               # Firebase Client SDK & Phone Auth helper
│   │   └── types/
│   │       ├── firebase.d.ts             # Firebase client module declarations
│   │       └── index.ts                  # Shared TypeScript data types
│   ├── .env.local                        # Frontend environment credentials
│   ├── .env.example                      # Frontend environment template
│   ├── package.json                      # Next.js & React dependencies
│   └── tsconfig.json                     # TypeScript compiler configuration
└── README.md                             # This file
```

---

## 🚀 Getting Started Locally

### Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** and `npm` installed
- Google Cloud / Firebase Project (`gdgcodealchemist`)
- Gemini API Key from [Google AI Studio](https://aistudio.google.com/apikey)

---

### Step 1: Configure Backend

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # On Windows:
   .\.venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Verify `backend/.env` has your configuration:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-3.8-flash
   GEMINI_TTS_MODEL=gemini-3.8-flash
   GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
   FIREBASE_PROJECT_ID=gdgcodealchemist
   MODEL_PATH=rf_model.joblib
   USE_MOCK_AI=false
   ```
   *(Ensure `serviceAccountKey.json` is present in the `backend/` directory).*

5. Run unit and integration tests:
   ```bash
   pytest -v
   ```

6. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *FastAPI will be live at `http://localhost:8000` (Docs at `http://localhost:8000/docs`).*

---

### Step 2: Configure Frontend

1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Verify `frontend/.env.local` contains:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDYhZy9TLUbc3TKfIspbVTvItg_atk1oIc
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gdgcodealchemist.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=gdgcodealchemist
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gdgcodealchemist.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=690303491579
   NEXT_PUBLIC_FIREBASE_APP_ID=1:690303491579:web:fd8c6cea7231872918ff5e
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-8PD2L8LGG7
   ```
4. Test the production build:
   ```bash
   npm run build
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
   *Frontend will be live at `http://localhost:3000`.*

---

## 🤖 Machine Learning Model Integration (`rf_model.joblib`)

The Risk Engine is pre-configured to automatically load a scikit-learn Random Forest model trained on the standard 6 UCI Maternal Health features:

| Feature Name | Description | Standard Range | Auto-Conversion in Engine |
| :--- | :--- | :--- | :--- |
| `Age` | Maternal Age (years) | 10 – 70 | Passed directly |
| `SystolicBP` | Upper Blood Pressure (mmHg) | 70 – 160 | Passed directly |
| `DiastolicBP` | Lower Blood Pressure (mmHg) | 49 – 100 | Passed directly |
| `BS` | Blood Glucose ($mmol/L$) | 6.0 – 19.0 | If entered in $mg/dL$ ($>35$), auto-converted via $\div 18.0$ |
| `BodyTemp` | Body Temperature ($^\circ\text{F}$) | 98.0 – 103.0 | If entered in $^\circ\text{C}$ ($<45$), auto-converted via $(C \times 1.8) + 32$ |
| `HeartRate` | Resting Heart Rate (bpm) | 60 – 90 | Passed directly |

**To drop in your trained model:**
1. Export your trained model: `joblib.dump(model, 'rf_model.joblib')`
2. Place `rf_model.joblib` directly inside `backend/`.
3. Restart or reload the backend. The backend will log:
   `[ML Engine] Loaded custom trained model from rf_model.joblib`

*(If the file is not present, the system seamlessly uses its calibrated baseline model, ensuring 100% uptime).*

---

## 🧪 Verification & Test Results

- **Backend Pytest Suite**:
  ```bash
  backend/tests/test_pipeline.py::test_unseeded_initial_state_and_health PASSED
  backend/tests/test_pipeline.py::test_phone_otp_signup_and_login PASSED
  backend/tests/test_pipeline.py::test_register_mother_and_evaluate_visit_with_anemia_and_bp_trend PASSED
  backend/tests/test_pipeline.py::test_bulk_dataset_import_and_sos_dispatch PASSED
  ======================== 4 passed in 1.69s =========================
  ```
- **Frontend Production Build**:
  ```bash
  ✓ Compiled successfully in 5.4s
  ✓ Generating static pages using 7 workers (6/6) in 12.6s
  Route (app)
  ┌ ○ /
  ├ ○ /_not-found
  ├ ○ /asha
  └ ○ /mother
  ```

---

## 👥 Team Code Alchemists
Developed for the **Google Developer Groups (GDG) Hackathon**.
- **Frontend & Systems Architecture**: Next.js 16 + Firebase Client Auth
- **Backend & Clinical Risk Pipeline**: FastAPI + Gemini 3.8 Flash + MoHFW Protocols
- **Machine Learning**: Random Forest Classifier + Trajectory Analysis
