'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { TrimesterProgressRail } from '@/components/TrimesterProgressRail';
import { AudioAdvisoryPlayer } from '@/components/AudioAdvisoryPlayer';
import { VitalsCard } from '@/components/VitalsCard';
import { EmergencySosModal } from '@/components/EmergencySosModal';
import { RegisterMotherModal } from '@/components/RegisterMotherModal';
import { useApp } from '@/context/AppContext';

export default function MotherCompanionPage() {
  const {
    mothers,
    activeMotherId,
    setActiveMotherId,
    saveDailyTasks,
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const mother =
    mothers.find((m) => m.id === activeMotherId) || mothers[0] || null;

  const tasks = mother?.dailyTasks || [];
  const completedCount = tasks.filter((t) => t.completed).length;

  const toggleTask = async (id: string) => {
    if (!mother) return;
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    await saveDailyTasks(mother.id, updated);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="companion-view"
        onOpenSosModal={() => setSosModalOpen(true)}
      />

      <div className="lg:pl-72 flex-1 flex flex-col">
        <Header
          currentRole="mother"
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSosModal={() => setSosModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
          {!mother ? (
            <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20 text-center space-y-4">
              <h2 className="text-xl font-extrabold text-primary-container">
                No Expectant Mother Profile Loaded Yet
              </h2>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                Register a mother profile first (or sign in with Phone + OTP) to view personalized pregnancy progress, Hindi voice advisories, and daily care tasks.
              </p>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold shadow-md"
              >
                + Register Mother Profile
              </button>
            </div>
          ) : (
            <>
              {/* Welcome & Active Mother Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 shadow-xs">
                <div>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                    मातृ सुरक्षा साथी • Personal Pregnancy Companion
                  </span>
                  <h1 className="text-2xl font-extrabold text-primary-container mt-0.5">
                    नमस्ते, {mother.hindiName || mother.name} 🙏
                  </h1>
                  <p className="text-xs text-on-surface-variant">
                    ID: {mother.id} • Age {mother.age} yrs • {mother.ward}, {mother.village}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {mothers.length > 1 && (
                    <select
                      value={mother.id}
                      onChange={(e) => setActiveMotherId(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"
                    >
                      {mothers.map((m) => (
                        <option key={m.id} value={m.id}>
                          Switch: {m.name} ({m.id})
                        </option>
                      ))}
                    </select>
                  )}

                  <a
                    href={`tel:${mother.assignedAsha.phone.replace(/[^0-9]/g, '')}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold shadow-xs hover:bg-secondary/90 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                    <span>ASHA दीदी को कॉल करें ({mother.assignedAsha.name})</span>
                  </a>
                </div>
              </div>

              {/* 1. Bilingual Audio Advisory Player */}
              <AudioAdvisoryPlayer
                motherName={mother.name}
                hindiAdvisory={
                  mother.aiHindiAdvisory ||
                  `नमस्ते ${mother.name}, आपकी वर्तमान जांच में ब्लड प्रेशर ${mother.bloodPressure} और हीमोग्लोबिन ${mother.hemoglobin} ग्राम है। कृपया रोजाना आयरन और कैल्शियम की गोलियां लें।`
                }
                englishTranslation={
                  mother.aiEnglishSummary ||
                  `Your latest BP is ${mother.bloodPressure} mmHg and Hemoglobin is ${mother.hemoglobin} g/dL. Continue daily IFA and Calcium supplements.`
                }
                audioBase64={mother.audioBase64}
              />

              {/* 2. Pregnancy Trimester Progress Tracker */}
              <TrimesterProgressRail
                currentWeek={mother.gestationalWeek}
                eddDate={mother.edd}
                daysRemaining={Math.max(0, (40 - mother.gestationalWeek) * 7)}
                lastCheckupDate={mother.lastVisitDate}
                nextCheckupDate={mother.nextDueDate}
              />

              {/* 3. Live Vitals Snapshot */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-primary-container">
                    आपकी स्वास्थ्य जांच (Latest Vitals Summary)
                  </h2>
                  <span className="text-xs text-on-surface-variant font-medium">
                    Last Recorded: {mother.lastVisitDate}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <VitalsCard
                    title="Blood Pressure"
                    hindiTitle="रक्तचाप (बीपी)"
                    value={mother.bloodPressure}
                    unit="mmHg"
                    statusText={mother.riskLevel === 'HIGH' ? 'उच्च (High Alert)' : 'सामान्य (Normal)'}
                    statusType={mother.riskLevel === 'HIGH' ? 'error' : 'success'}
                    icon="bloodtype"
                    tagline="Ideal: Below 130/85 mmHg"
                  />
                  <VitalsCard
                    title="Hemoglobin (Hb)"
                    hindiTitle="खून की मात्रा"
                    value={mother.hemoglobin}
                    unit="g/dL"
                    statusText={
                      mother.hemoglobin < 9.0
                        ? 'गंभीर एनीमिया (Severe)'
                        : mother.hemoglobin < 11.0
                        ? 'आयरन आवश्यक (Low)'
                        : 'सामान्य (Normal)'
                    }
                    statusType={
                      mother.hemoglobin < 9.0
                        ? 'error'
                        : mother.hemoglobin < 11.0
                        ? 'warning'
                        : 'success'
                    }
                    icon="water_drop"
                    tagline="Target: > 11.0 g/dL"
                  />
                  <VitalsCard
                    title="Blood Sugar & Temp"
                    hindiTitle="ब्लड शुगर और तापमान"
                    value={`${mother.bloodSugar ?? 5.2}`}
                    unit="mmol/L"
                    statusText={`Temp: ${mother.bodyTemp ?? 98.4} °F`}
                    statusType={(mother.bloodSugar ?? 5.2) >= 7.8 ? 'error' : 'success'}
                    icon="glucose"
                    tagline={`Maternal HR: ${mother.heartRate ?? 78} bpm`}
                  />
                  <VitalsCard
                    title="Baby Heart Rate"
                    hindiTitle="शिशु की धड़कन"
                    value={mother.fetalHeartRate}
                    unit="bpm"
                    statusText="स्वस्थ और सक्रिय (Active)"
                    statusType="success"
                    icon="favorite"
                    tagline={`Maternal Weight: ${mother.weight} kg`}
                  />
                </div>
              </section>

              {/* 4. Interactive Daily Care & Nutrition Checklist */}
              <section className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 border border-outline-variant/20 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-primary-container">
                      दैनिक देखभाल और दवाइयां (Daily Care Checklist)
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Tap to mark your daily supplements and rest complete (Saved to Backend)
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-extrabold">
                    {completedCount} / {tasks.length} पूरा हुआ
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        task.completed
                          ? 'bg-secondary-container/20 border-secondary/40'
                          : 'bg-surface-container-low border-outline-variant/30 hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            task.completed
                              ? 'bg-secondary text-on-secondary'
                              : 'bg-surface-container-lowest text-primary-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {task.icon}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-on-surface">
                            {task.hindiTitle}
                          </h3>
                          <p className="text-xs font-semibold text-secondary">
                            {task.title}
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            {task.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className=" flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded">
                          {task.timeLabel}
                        </span>
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            task.completed
                              ? 'bg-secondary text-on-secondary'
                              : 'border-2 border-outline-variant text-transparent'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            check
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      <EmergencySosModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        initialMother={mother}
      />
      <RegisterMotherModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
      />
    </div>
  );
}
