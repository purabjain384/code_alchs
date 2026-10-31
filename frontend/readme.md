# MatruRaksha - Maternal Care OS & Clinical Surveillance Platform

A life-critical maternal healthcare monitoring platform built with Next.js (App Router), React, TypeScript, and Tailwind CSS. The app bridges frontline community ASHA workers, hospital doctors/supervisors, and expectant mothers under a unified design system.

---

## 📱 Pages & Roles

1. **Supervisor Command Dashboard (`/` or `/supervisor`)**
   - High-impact operational KPI tiles (`Total Registered Mothers`, `High-Risk Cases`, `Active ASHA Field Force`, `Overdue ANC Visits`).
   - Surveillance analytics: 6-month pregnancy registrations trend bar chart, ANC 4-checklist completion gauge (82.6%), maternal risk stratification breakdown, and village cluster caseload distribution.
   - Clinical surveillance cohort roster with live search, risk filters (`All`, `High Risk`, `Moderate`, `Low`), and direct actions (`Record ANC`, `108 SOS Dispatch`).

2. **ASHA Worker Field Companion (`/asha`)**
   - Touch-optimized for frontline fieldwork with bilingual English/Hindi terminology.
   - Offline sync status indicator with local queue drawer and one-click force sync.
   - Quick action triggers: Register New Mother, Record Antenatal Visit, Mothers Directory.
   - Prioritized daily home visits list with patient portraits, risk badges, quick call affordance, and clinical assessment launch.
   - Emergency 108 ambulance contacts and clinical diagnostic checklist.

3. **Mother Pregnancy Companion (`/mother`)**
   - Calming, reassuring maternal health view with ABHA ID registration.
   - Trimester & weekly milestone rail (Week 28 active, 84 days to EDD).
   - Voice advisory player with interactive Hindi audio message from ASHA Sunita Didi and translation toggle.
   - Empathetic vitals cards: Blood Pressure (120/80), Weight (+8.5 kg), Fetal Heart Rate (142 bpm), Hemoglobin (11.4 g/dL).
   - Interactive daily care routine checklist (IFA tablet, Calcium, ANC-3 reminder).
   - Nutrition corner with traditional iron-rich dietary guidance and danger signs alert.

---

## 🧩 Shared Components & Props Architecture

Shared assets and repeated visual patterns across screens have been extracted into reusable, prop-driven React components:

| Component | Props | Shared Usage |
| :--- | :--- | :--- |
| **`Header`** | `currentRole`, `onToggleSidebar`, `onOpenSosModal` | Unified brand header across all pages, persona tabs switcher, notifications, profile pill |
| **`Sidebar`** | `isOpen`, `onClose`, `activeTab`, `onTabChange`, `onOpenSosModal` | Responsive navigation with clinical surveillance & administration routes, 108 referral trigger |
| **`StatCard`** | `title`, `bilingualTitle`, `value`, `subValue`, `trend`, `icon`, `accentColor`, `leftBorderColor`, `badge`, `tags`, `progressRing`, `footerLeft`, `footerRight` | Used in Supervisor KPI grid & ASHA operational metric tiles |
| **`RiskBadge`** | `level` (`'HIGH' \| 'MODERATE' \| 'LOW'`), `label`, `showDot` | High-risk (pulsing red), Moderate (amber), Low-risk (teal) status indicators |
| **`MotherCard`** | `mother`, `onStartAssessment`, `onViewProfile`, `onReferral` | Displays expectant mother card with portrait avatar, risk flags, gestational age, and action buttons |
| **`VitalsCard`** | `title`, `hindiTitle`, `value`, `unit`, `subtitle`, `statusText`, `statusType`, `icon`, `tagline` | Vitals monitoring cards for BP, weight, fetal heart rate, and hemoglobin |
| **`TrimesterProgressRail`** | `currentWeek`, `eddDate`, `daysRemaining`, `lastCheckupDate`, `nextCheckupDate` | 40-week milestone tracker divided across Trimester 1, 2, and 3 |
| **`AudioAdvisoryPlayer`** | `senderName`, `timestamp`, `hindiMessage`, `englishTranslation`, `onScheduleReminder` | Interactive voice player with animated audio waveform, timer, and translation toggle |
| **`EmergencySosModal`** | `isOpen`, `onClose`, `initialMother` | 108 ALS ambulance dispatch modal with triage condition, FRU hospital routing, and live tracking simulation |
| **`RegisterMotherModal`** | `isOpen`, `onClose`, `onSave` | Frontline RCH registration modal with vital intake and automatic risk classification |
| **`RecordAncVisitModal`** | `isOpen`, `onClose`, `mother`, `onSaved` | Form for recording ANC encounters, issuing IFA/Calcium tablets, and updating ledger |

---

## 🚀 Running the App

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```
