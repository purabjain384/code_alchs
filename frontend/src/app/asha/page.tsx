'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { MotherCard } from '@/components/MotherCard';
import { RecordAncVisitModal } from '@/components/RecordAncVisitModal';
import { RegisterMotherModal } from '@/components/RegisterMotherModal';
import { EmergencySosModal } from '@/components/EmergencySosModal';
import { MotherProfileModal } from '@/components/MotherProfileModal';
import { DEFAULT_ASHA_AVATAR_URL } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import { MotherRecord, RiskLevel } from '@/types';

export default function AshaCompanionPage() {
  const { mothers, currentUser, offlineQueue, syncOfflineQueue } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | RiskLevel | 'OVERDUE'>('ALL');
  const [ancModalOpen, setAncModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedMother, setSelectedMother] = useState<MotherRecord | null>(null);
  const [syncMessage, setSyncMessage] = useState('');

  const filteredMothers = mothers.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.village.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterTab === 'ALL') return true;
    if (filterTab === 'OVERDUE') return Boolean(m.isOverdue);
    return m.riskLevel === filterTab;
  });

  const handleStartAssessment = (mother: MotherRecord) => {
    setSelectedMother(mother);
    setAncModalOpen(true);
  };

  const handleOpenReferral = (mother: MotherRecord) => {
    setSelectedMother(mother);
    setSosModalOpen(true);
  };

  const handleOpenProfile = (mother: MotherRecord) => {
    setSelectedMother(mother);
    setProfileModalOpen(true);
  };

  const handleSyncOffline = async () => {
    const count = await syncOfflineQueue();
    setSyncMessage(
      count > 0 ? `Synced ${count} visit(s)!` : 'All visits synced with Firestore'
    );
    setTimeout(() => setSyncMessage(''), 3000);
  };

  const highRiskCount = mothers.filter((m) => m.riskLevel === 'HIGH').length;
  const overdueCount = mothers.filter((m) => m.isOverdue).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="asha-workers"
        onOpenSosModal={() => setSosModalOpen(true)}
      />

      <div className="lg:pl-72 flex-1 flex flex-col">
        <Header
          currentRole="asha"
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSosModal={() => setSosModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* ASHA Worker Identity Banner */}
          <section className="rounded-2xl bg-gradient-to-r from-primary-container via-primary to-primary-container text-on-primary p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-secondary-fixed shrink-0">
                <Image
                  src={DEFAULT_ASHA_AVATAR_URL}
                  alt="ASHA Worker"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-secondary text-on-secondary text-[10px] font-extrabold uppercase">
                    {currentUser?.asha_id || 'ASHA-704'}
                  </span>
                  <span className="text-xs text-secondary-fixed font-semibold">
                    • {currentUser?.village || 'Rampura'} ({currentUser?.ward || 'Ward 1 & 2'})
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold mt-0.5">
                  नमस्ते, {currentUser?.name || 'Sunita Ji'} (Field Companion)
                </h1>
                <p className="text-xs text-primary-fixed/80">
                  Community Maternal Surveillance • Live 3-Layer AI Triage & Hindi Voice Advisory
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSyncOffline}
                className="px-3.5 py-2.5 rounded-xl bg-white/15 text-white hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {offlineQueue.length > 0 ? 'sync' : 'cloud_done'}
                </span>
                <span>
                  {syncMessage ||
                    (offlineQueue.length > 0
                      ? `Sync Offline Queue (${offlineQueue.length})`
                      : 'Cloud Synced ✓')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRegisterModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed text-xs font-extrabold shadow-md hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>+ Register New Mother</span>
              </button>
            </div>
          </section>

          {/* Dynamic Field Summary Strip */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 shadow-2xs">
              <span className="text-[11px] font-bold uppercase text-on-surface-variant">
                Assigned Mothers
              </span>
              <p className="text-2xl font-extrabold text-on-surface mt-1">
                {mothers.length}
              </p>
              <span className="text-[11px] text-secondary font-semibold">
                Active Ward Roster
              </span>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 shadow-2xs">
              <span className="text-[11px] font-bold uppercase text-on-surface-variant">
                Moderate Risk Follow-ups
              </span>
              <p className="text-2xl font-extrabold text-tertiary mt-1">
                {mothers.filter((m) => m.riskLevel === 'MODERATE').length}
              </p>
              <span className="text-[11px] text-on-surface-variant font-medium">
                Bi-weekly ANC Monitor
              </span>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-xl border border-error/25 shadow-2xs">
              <span className="text-[11px] font-bold uppercase text-error">
                High-Risk Alerts
              </span>
              <p className="text-2xl font-extrabold text-error mt-1">
                {highRiskCount}
              </p>
              <span className="text-[11px] text-error font-semibold">
                Priority PHC Escalation
              </span>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 shadow-2xs">
              <span className="text-[11px] font-bold uppercase text-on-surface-variant">
                Offline Queue
              </span>
              <p className="text-2xl font-extrabold text-secondary mt-1">
                {offlineQueue.length}
              </p>
              <span className="text-[11px] text-on-surface-variant font-medium">
                Pending Visits
              </span>
            </div>
          </section>

          {/* Filter & Search Toolbar */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { key: 'ALL', label: `All (${mothers.length})` },
                  { key: 'HIGH', label: `High Risk (${highRiskCount})` },
                  { key: 'OVERDUE', label: `Overdue (${overdueCount})` },
                  { key: 'MODERATE', label: 'Moderate' },
                  { key: 'LOW', label: 'Normal' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    filterTab === tab.key
                      ? 'bg-secondary text-on-secondary shadow-2xs'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                placeholder="Search mother name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:border-secondary"
              />
            </div>
          </section>

          {/* Mother Cards List */}
          <section className="space-y-4">
            {filteredMothers.length === 0 ? (
              <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/20 space-y-3">
                <p className="text-sm font-bold text-on-surface">
                  No mothers registered in your caseload yet.
                </p>
                <p className="text-xs text-on-surface-variant">
                  Click &ldquo;+ Register New Mother&rdquo; above to add a mother and start recording ANC checkups.
                </p>
              </div>
            ) : (
              filteredMothers.map((mother) => (
                <MotherCard
                  key={mother.id}
                  mother={mother}
                  onStartAssessment={handleStartAssessment}
                  onReferral={handleOpenReferral}
                  onViewProfile={handleOpenProfile}
                />
              ))
            )}
          </section>
        </main>
      </div>

      <RecordAncVisitModal
        isOpen={ancModalOpen}
        onClose={() => setAncModalOpen(false)}
        initialMother={selectedMother}
      />

      <RegisterMotherModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
      />

      <EmergencySosModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        initialMother={selectedMother}
      />

      <MotherProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        mother={selectedMother}
        onOpenAncModal={handleStartAssessment}
        onOpenSosModal={handleOpenReferral}
      />
    </div>
  );
}
