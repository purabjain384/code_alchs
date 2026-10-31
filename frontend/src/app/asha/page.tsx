'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { MotherCard } from '@/components/MotherCard';
import { StatCard } from '@/components/StatCard';
import { EmergencySosModal } from '@/components/EmergencySosModal';
import { RegisterMotherModal } from '@/components/RegisterMotherModal';
import { RecordAncVisitModal } from '@/components/RecordAncVisitModal';
import { MOCK_MOTHERS, MOCK_ASHA_WORKER } from '@/data/mockData';
import { MotherRecord } from '@/types';

export default function AshaFieldDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [syncDrawerOpen, setSyncDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mothersList, setMothersList] = useState<MotherRecord[]>(MOCK_MOTHERS);

  // Modals state
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [ancModalOpen, setAncModalOpen] = useState(false);
  const [selectedMother, setSelectedMother] = useState<MotherRecord | null>(null);

  const handleOpenSos = (mother?: MotherRecord) => {
    setSelectedMother(mother || null);
    setSosModalOpen(true);
  };

  const handleOpenAnc = (mother: MotherRecord) => {
    setSelectedMother(mother);
    setAncModalOpen(true);
  };

  const handleMotherAdded = (newMother: MotherRecord) => {
    setMothersList([newMother, ...mothersList]);
  };

  const handleMotherUpdated = (updatedMother: MotherRecord) => {
    setMothersList(
      mothersList.map((m) => (m.id === updatedMother.id ? updatedMother : m))
    );
  };

  const handleForceSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert('Offline records successfully synchronized with Raigad PHC Cloud Server!');
    }, 1000);
  };

  // Today's priority visits (e.g. Rampura village mothers)
  const todaysVisits = mothersList.filter((m) => m.village === 'Rampura');

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="asha-workers"
        onOpenSosModal={() => handleOpenSos()}
      />

      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Global Header */}
        <Header
          currentRole="asha"
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSosModal={() => handleOpenSos()}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Greeting & Field Identity Banner */}
          <section className="relative overflow-hidden rounded-2xl bg-primary-container text-on-primary p-6 sm:p-8 shadow-md">
            <div className="absolute -right-12 -bottom-16 w-80 h-80 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
            <div className="absolute right-1/4 -top-20 w-60 h-60 rounded-full bg-tertiary-fixed/15 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-on-primary-fixed/40 text-tertiary-fixed text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-ping" />
                  Field Companion Portal • फील्ड साथी पोर्टल
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-on-primary tracking-tight">
                  नमस्ते, {MOCK_ASHA_WORKER.name}!{' '}
                  <span className="text-sm font-normal text-primary-fixed">
                    ({MOCK_ASHA_WORKER.id})
                  </span>
                </h1>

                <p className="text-xs sm:text-sm text-primary-fixed-dim flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-secondary-fixed">
                      home_pin
                    </span>
                    <span>
                      Assigned Area: <strong className="text-on-primary">{MOCK_ASHA_WORKER.assignedVillage} ({MOCK_ASHA_WORKER.ward})</strong>
                    </span>
                  </span>
                  <span className="opacity-40 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-secondary-fixed">
                      local_hospital
                    </span>
                    <span>
                      PHC: <strong className="text-on-primary">{MOCK_ASHA_WORKER.phcCenter}</strong>
                    </span>
                  </span>
                </p>
              </div>

              {/* Sync Status Badge + SOS Emergency */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div
                  onClick={() => setSyncDrawerOpen(!syncDrawerOpen)}
                  className="flex flex-col justify-center px-4 py-2.5 rounded-xl bg-surface-container-lowest/10 backdrop-blur-md cursor-pointer transition-all hover:bg-surface-container-lowest/20 border border-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed animate-pulse" />
                      <span className="text-xs font-bold text-secondary-fixed">
                        Online & Synced
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-primary-fixed">
                      tune
                    </span>
                  </div>
                  <p className="text-[11px] text-primary-fixed-dim pt-0.5">
                    Updated Just now • Click for offline queue
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenSos()}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-error hover:bg-error/90 text-on-error font-bold text-sm shadow-md transition-all active:scale-95 group"
                >
                  <span className="material-symbols-outlined text-[22px] group-hover:animate-bounce">
                    e911_emergency
                  </span>
                  <span>SOS 108 Dispatch</span>
                </button>
              </div>
            </div>

            {/* Offline Sync Details Tray */}
            {syncDrawerOpen && (
              <div className="mt-4 pt-4 border-t border-on-primary-container/30 bg-on-primary-fixed/20 rounded-xl p-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-on-primary">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tertiary-fixed text-[26px]">
                      cloud_sync
                    </span>
                    <div>
                      <p className="font-bold text-sm">
                        Local Offline Storage Active (ऑफ़लाइन कतार)
                      </p>
                      <p className="text-xs text-primary-fixed">
                        3 maternal health records & 1 ANC draft stored safely on device. Auto-sync trigger active.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleForceSync}
                    className="px-4 py-2 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold hover:bg-tertiary-fixed-dim transition-colors"
                  >
                    {isSyncing ? 'Syncing...' : 'Force Sync Now'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Large Primary Action Buttons (Touch-Optimized for Rural Field Operations) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Register New Mother */}
            <div
              onClick={() => setRegisterModalOpen(true)}
              className="group relative overflow-hidden rounded-2xl bg-primary-container p-6 text-on-primary shadow-xs hover:shadow-lg transition-all cursor-pointer border border-on-primary-container/20 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-bold shadow-xs">
                  <span className="material-symbols-outlined text-[28px]">person_add</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold uppercase tracking-wider">
                  Priority +
                </span>
              </div>

              <div className="my-4">
                <div className="flex items-center gap-1.5 text-tertiary-fixed text-xs font-bold uppercase tracking-wide">
                  <span>Rapid Intake</span>
                  <span>•</span>
                  <span>नया पंजीकरण</span>
                </div>
                <h2 className="text-xl font-bold text-on-primary group-hover:text-tertiary-fixed transition-colors mt-0.5">
                  Register New Mother
                </h2>
                <p className="text-xs text-primary-fixed mt-1">
                  नई गर्भवती महिला का पंजीकरण करें (Aadhaar & RCH ID)
                </p>
              </div>

              <div className="flex items-center justify-between text-tertiary-fixed text-xs font-bold pt-2 border-t border-on-primary-container/20">
                <span>Open Quick Form</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>

            {/* 2. Record Antenatal Visit */}
            <div
              onClick={() => handleOpenAnc(todaysVisits[0])}
              className="group relative overflow-hidden rounded-2xl bg-secondary p-6 text-on-secondary shadow-xs hover:shadow-lg transition-all cursor-pointer border border-secondary/20 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold shadow-xs">
                  <span className="material-symbols-outlined text-[28px]">clinical_notes</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider">
                  Field ANC
                </span>
              </div>

              <div className="my-4">
                <div className="flex items-center gap-1.5 text-secondary-fixed-dim text-xs font-bold uppercase tracking-wide">
                  <span>Diagnostic Checklist</span>
                  <span>•</span>
                  <span>जाँच फॉर्म</span>
                </div>
                <h2 className="text-xl font-bold text-on-secondary mt-0.5">
                  Record Antenatal Visit
                </h2>
                <p className="text-xs text-on-secondary/80 mt-1">
                  ANC जाँच फॉर्म भरें (BP, Vitals, IFA, Td बूस्टर)
                </p>
              </div>

              <div className="flex items-center justify-between text-secondary-fixed text-xs font-bold pt-2 border-t border-white/10">
                <span>Start Assessment</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>

            {/* 3. View All Mothers Directory */}
            <div
              onClick={() => {
                const el = document.getElementById('visits-workbench');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group relative overflow-hidden rounded-2xl bg-surface-container-high p-6 text-on-surface shadow-xs hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-surface-container-lowest text-on-surface flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[28px]">groups_2</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-on-surface-variant text-[10px] font-bold">
                  {MOCK_ASHA_WORKER.mothersCount} Enrolled
                </span>
              </div>

              <div className="my-4">
                <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-bold uppercase tracking-wide">
                  <span>Full Roster</span>
                  <span>•</span>
                  <span>मातृ डायरेक्टरी</span>
                </div>
                <h2 className="text-xl font-bold text-on-surface mt-0.5">
                  Mothers Directory
                </h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  गाँव की सभी माताएं देखें (Filtered by Ward & Trimester)
                </p>
              </div>

              <div className="flex items-center justify-between text-secondary text-xs font-bold pt-2 border-t border-outline-variant/20">
                <span>Browse Profiles</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>
          </section>

          {/* Operational Metrics (Bilingual High-Contrast) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Registered Mothers"
              bilingualTitle="कुल पंजीकृत माताएं"
              value={MOCK_ASHA_WORKER.mothersCount}
              icon="pregnant_woman"
              accentColor="secondary"
              footerLeft="Rampura Ward 1 (24)"
              footerRight="Ward 2 (18)"
            />

            <StatCard
              title="High-Risk Alert"
              bilingualTitle="गंभीर जोखिम माताएं"
              value={MOCK_ASHA_WORKER.highRiskCount}
              subValue="Urgent"
              leftBorderColor="bg-error"
              badge={{ text: 'Urgent Action', variant: 'error' }}
              icon="crisis_alert"
              accentColor="error"
              footerLeft="Pre-eclampsia & Severe Anemia"
            />

            <StatCard
              title="Visits Due Today"
              bilingualTitle="आज की गृह-भेंट"
              value={MOCK_ASHA_WORKER.totalVisitsToday}
              icon="calendar_today"
              accentColor="tertiary"
              footerLeft="Daily Target: 24 Oct Field Protocol"
            />

            <StatCard
              title="Completed Visits"
              bilingualTitle="पूर्ण जाँच रिपोर्ट"
              value={`${MOCK_ASHA_WORKER.completedVisitsToday} / ${MOCK_ASHA_WORKER.totalVisitsToday}`}
              subValue="75%"
              icon="task_alt"
              accentColor="secondary"
              progressRing={{ percentage: 75 }}
              footerLeft="75% Target Done"
            />
          </section>

          {/* Split Workbench: Today's Field Priority Visits vs Guidelines */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="visits-workbench">
            {/* Left 8-Cols: Today's Field Priority Mother Cards */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-error animate-ping" />
                  <h2 className="text-lg font-bold text-on-surface">
                    Today's Field Priority Visits (आज की प्राथमिकता)
                  </h2>
                </div>
                <span className="text-xs font-semibold text-on-surface-variant">
                  2 Pending • 6 Complete
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-4">
                {todaysVisits.map((mother) => (
                  <MotherCard
                    key={mother.id}
                    mother={mother}
                    onStartAssessment={() => handleOpenAnc(mother)}
                    onViewProfile={(m) => {
                      alert(`Mother Profile: ${m.name}\nGestational: Week ${m.gestationalWeek}\nBP: ${m.bloodPressure}\nHb: ${m.hemoglobin} g/dL\nDoctor Notes: ${m.doctorNotes}`);
                    }}
                    onReferral={() => handleOpenSos(mother)}
                  />
                ))}
              </div>
            </div>

            {/* Right 4-Cols: Quick Tools & Protocols */}
            <div className="lg:col-span-4 space-y-4">
              {/* Emergency Hotline Card */}
              <div className="p-5 rounded-2xl bg-error-container/40 border border-error-container text-on-error-container space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[24px] text-error">
                    contact_phone
                  </span>
                  <h3 className="font-bold text-sm text-error">
                    Emergency Clinical Contacts
                  </h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-container-lowest flex items-center justify-between">
                    <div>
                      <p className="font-bold text-on-surface">108 Ambulance Hotline</p>
                      <span className="text-[10px] text-on-surface-variant">Toll-Free 24x7</span>
                    </div>
                    <a
                      href="tel:108"
                      className="px-2.5 py-1 rounded-lg bg-error text-on-error font-bold"
                    >
                      Call 108
                    </a>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-container-lowest flex items-center justify-between">
                    <div>
                      <p className="font-bold text-on-surface">Dr. Priya Sharma (MO)</p>
                      <span className="text-[10px] text-on-surface-variant">Raigad PHC Ob-Gyn</span>
                    </div>
                    <a
                      href="tel:9829012345"
                      className="px-2.5 py-1 rounded-lg bg-secondary text-on-secondary font-bold"
                    >
                      Call MO
                    </a>
                  </div>
                </div>
              </div>

              {/* Diagnostic Quick Checklist Card */}
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-3 shadow-xs">
                <h3 className="font-bold text-sm text-primary-container flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    checklist
                  </span>
                  ASHA ANC Visit Checklist
                </h3>
                <ul className="space-y-2 text-xs text-on-surface-variant font-medium">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">
                      check_circle
                    </span>
                    <span>Measure Blood Pressure using digital sphygmomanometer.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">
                      check_circle
                    </span>
                    <span>Check for pedal edema / facial swelling (Pre-eclampsia sign).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">
                      check_circle
                    </span>
                    <span>Hand over 100 IFA tablets & confirm daily intake after dinner.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">
                      check_circle
                    </span>
                    <span>Verify Mamata Card records & EDD delivery plan with family.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Shared Modals */}
      <EmergencySosModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        initialMother={selectedMother}
      />

      <RegisterMotherModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSave={handleMotherAdded}
      />

      {selectedMother && (
        <RecordAncVisitModal
          isOpen={ancModalOpen}
          onClose={() => setAncModalOpen(false)}
          mother={selectedMother}
          onSaved={handleMotherUpdated}
        />
      )}
    </div>
  );
}

