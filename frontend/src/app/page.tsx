'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { StatCard } from '@/components/StatCard';
import { RiskBadge } from '@/components/RiskBadge';
import { EmergencySosModal } from '@/components/EmergencySosModal';
import { RegisterMotherModal } from '@/components/RegisterMotherModal';
import { RecordAncVisitModal } from '@/components/RecordAncVisitModal';
import { MotherProfileModal } from '@/components/MotherProfileModal';
import { useApp } from '@/context/AppContext';
import { MotherRecord, RiskLevel } from '@/types';

export default function SupervisorDashboardPage() {
  const { mothers, importDatasetRows, isLoading } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [ancModalOpen, setAncModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedMother, setSelectedMother] = useState<MotherRecord | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const highRiskMothers = mothers.filter((m) => m.riskLevel === 'HIGH');
  const moderateRiskMothers = mothers.filter((m) => m.riskLevel === 'MODERATE');

  const filteredMothers = mothers.filter((mother) => {
    const matchesSearch =
      mother.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mother.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mother.village.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk =
      selectedRiskFilter === 'ALL' || mother.riskLevel === selectedRiskFilter;
    return matchesSearch && matchesRisk;
  });

  // Dynamic Trimester Distribution
  const totalCount = mothers.length;
  const t1Count = mothers.filter((m) => m.trimester === 1).length;
  const t2Count = mothers.filter((m) => m.trimester === 2).length;
  const t3Count = mothers.filter((m) => m.trimester === 3).length;
  const t1Pct = totalCount ? Math.round((t1Count / totalCount) * 100) : 0;
  const t2Pct = totalCount ? Math.round((t2Count / totalCount) * 100) : 0;
  const t3Pct = totalCount ? Math.max(0, 100 - t1Pct - t2Pct) : 0;

  // Dynamic Village Caseload
  const villageMap = new Map<string, { total: number; highRisk: number }>();
  mothers.forEach((m) => {
    const cur = villageMap.get(m.village) || { total: 0, highRisk: 0 };
    cur.total += 1;
    if (m.riskLevel === 'HIGH') cur.highRisk += 1;
    villageMap.set(m.village, cur);
  });

  const handleOpenSos = (mother?: MotherRecord) => {
    setSelectedMother(mother || null);
    setSosModalOpen(true);
  };

  const handleOpenProfile = (mother: MotherRecord) => {
    setSelectedMother(mother);
    setProfileModalOpen(true);
  };

  const handleOpenAnc = (mother?: MotherRecord) => {
    setSelectedMother(mother || null);
    setAncModalOpen(true);
  };

  const handleExportCsv = () => {
    const headers = [
      'MotherID',
      'Name',
      'Age',
      'Village',
      'Ward',
      'GestationalWeek',
      'Trimester',
      'RiskLevel',
      'BloodPressure',
      'Hemoglobin',
      'BloodSugar_mmol',
      'BodyTemp_F',
      'HeartRate_bpm',
      'FHR_bpm',
      'ExplainabilityFlags',
    ];
    const rows = filteredMothers.map((m) => [
      m.id,
      `"${m.name}"`,
      m.age,
      `"${m.village}"`,
      `"${m.ward}"`,
      m.gestationalWeek,
      m.trimester,
      m.riskLevel,
      m.bloodPressure,
      m.hemoglobin,
      m.bloodSugar ?? 5.2,
      m.bodyTemp ?? 98.4,
      m.heartRate ?? 78,
      m.fetalHeartRate,
      `"${(m.aiExplainability || []).join('; ')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matruraksha_registry_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDatasetFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let rows: Array<Record<string, unknown>> = [];
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Parse CSV (e.g. Age,SystolicBP,DiastolicBP,BS,BodyTemp,HeartRate,RiskLevel)
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h) => h.trim());
          rows = lines.slice(1, 51).map((line, idx) => {
            const values = line.split(',').map((v) => v.trim());
            const obj: Record<string, unknown> = { name: `Dataset Mother #${idx + 1}` };
            headers.forEach((h, i) => {
              obj[h] = values[i];
            });
            return obj;
          });
        }
      }
      if (rows.length > 0) {
        await importDatasetRows(rows);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to parse dataset file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSosModal={() => handleOpenSos()}
      />

      <div className="lg:pl-72 flex-1 flex flex-col">
        <Header
          currentRole="supervisor"
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSosModal={() => handleOpenSos()}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-outline-variant/20">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold uppercase tracking-wider">
                  District Medical Officer Console
                </span>
                <span className="text-xs text-on-surface-variant font-medium">
                  • Live Backend & ML Surveillance
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-container tracking-tight mt-1">
                Maternal Health & High-Risk Surveillance
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleDatasetFileImport}
                className="hidden"
              />
              <button
                type="button"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold border border-outline-variant/30 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  upload_file
                </span>
                <span>{importing ? 'Importing...' : 'Import Dataset (CSV/JSON)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setRegisterModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-bold shadow-xs hover:bg-secondary/90 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>+ Register Mother</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAnc()}
                className="px-3.5 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-xs hover:opacity-95 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">medical_services</span>
                <span>+ Record ANC Visit</span>
              </button>
            </div>
          </div>

          {/* 4 Live KPI Stat Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Total Registered Mothers"
              value={String(mothers.length)}
              trend={{
                text: mothers.length > 0 ? 'Live Registry' : 'Unseeded',
                positive: true,
              }}
              footerLeft="Synced with Firestore & ML Engine"
              icon="pregnant_woman"
              accentColor="secondary"
            />
            <StatCard
              title="High-Risk Mothers (ML + MoHFW)"
              value={String(highRiskMothers.length)}
              trend={{
                text:
                  mothers.length > 0
                    ? `${Math.round((highRiskMothers.length / mothers.length) * 100)}% of caseload`
                    : '0%',
                positive: false,
              }}
              footerLeft="Severe BP, Anemia, or Rising Trajectory"
              icon="warning"
              accentColor="error"
            />
            <StatCard
              title="Moderate-Risk Follow-ups"
              value={String(moderateRiskMothers.length)}
              trend={{ text: 'Bi-weekly ANC', neutral: true }}
              footerLeft="Borderline Vitals / Moderate Anemia"
              icon="event_available"
              accentColor="tertiary"
            />
            <StatCard
              title="Active Villages Covered"
              value={String(villageMap.size)}
              trend={{ text: '24x7 Field Sync', positive: true }}
              footerLeft="ASHA & PHC Connected Nodes"
              icon="diversity_1"
              accentColor="primary"
            />
          </section>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* High-Risk Escalation Feed */}
              <section
                id="high-risk"
                className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-xs border border-outline-variant/20 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-error animate-ping" />
                    <div>
                      <h2 className="text-lg font-extrabold text-primary-container">
                        Critical High-Risk Escalation Feed ({highRiskMothers.length})
                      </h2>
                      <p className="text-xs text-on-surface-variant">
                        Flagged by 6-Feature Random Forest ML, MoHFW Red Flags & Trajectory Analyzer
                      </p>
                    </div>
                  </div>
                </div>

                {highRiskMothers.length === 0 ? (
                  <div className="p-6 rounded-xl bg-surface-container-low text-center text-xs text-on-surface-variant">
                    No high-risk mothers flagged yet. Register a mother, record an ANC visit, or import rows from your testing dataset.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {highRiskMothers.map((mother) => (
                      <div
                        key={mother.id}
                        className="p-4 rounded-xl bg-error-container/20 border border-error/25 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-error shrink-0">
                              <Image
                                src={mother.avatarUrl}
                                alt={mother.name}
                                fill
                                sizes="44px"
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-error text-on-error">
                                  {mother.id}
                                </span>
                                <h3 className="text-sm font-extrabold text-on-surface">
                                  {mother.name}
                                </h3>
                              </div>
                              <p className="text-[11px] text-on-surface-variant font-medium">
                                Age {mother.age} • Week {mother.gestationalWeek} (T{mother.trimester}) • {mother.village}
                              </p>
                            </div>
                          </div>
                          <RiskBadge level="HIGH" />
                        </div>

                        <div className="bg-surface-container-lowest p-3 rounded-lg border border-error/15 space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-error flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">psychology</span>
                            <span>AI Risk Factors & Explainability</span>
                          </div>
                          <ul className="text-xs text-on-surface space-y-1 font-medium">
                            {(mother.aiExplainability || [mother.riskReason]).map((reason, idx) => (
                              <li key={idx} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(mother)}
                            className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-bold hover:bg-surface-container-high"
                          >
                            View Trajectory
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSos(mother)}
                            className="px-3 py-1.5 rounded-lg bg-error text-on-error font-bold hover:bg-error/90 flex items-center gap-1 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[14px]">ambulance</span>
                            <span>Dispatch 108 FRU</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Explainable AI Risk Table */}
              <section
                id="roster"
                className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-xs border border-outline-variant/20 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-primary-container">
                      Maternal Registry & Explainable AI Triage ({filteredMothers.length})
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Live database records with 6-Feature ML & NHM clinical flags
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="Search name, ID, village..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:border-secondary"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={filteredMothers.length === 0}
                      className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold border border-outline-variant/30 flex items-center gap-1 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Risk Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(['ALL', 'HIGH', 'MODERATE', 'LOW'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedRiskFilter(lvl)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        selectedRiskFilter === lvl
                          ? 'bg-primary-container text-on-primary shadow-xs'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {lvl === 'ALL' ? `All Mothers (${mothers.length})` : `${lvl} Risk`}
                    </button>
                  ))}
                </div>

                {isLoading ? (
                  <p className="py-8 text-center text-xs text-on-surface-variant">
                    Loading maternal registry from backend...
                  </p>
                ) : filteredMothers.length === 0 ? (
                  <div className="py-10 text-center space-y-3 bg-surface-container-low rounded-xl p-6">
                    <p className="text-sm font-bold text-on-surface">
                      No mothers in registry yet.
                    </p>
                    <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                      Click &ldquo;+ Register Mother&rdquo; or &ldquo;Import Dataset (CSV/JSON)&rdquo; above to add mothers and evaluate them with the 3-layer ML + MoHFW Risk Engine.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/30 text-[11px] font-bold uppercase text-on-surface-variant tracking-wider">
                          <th className="py-3 px-3">Mother / ID</th>
                          <th className="py-3 px-3">Gestation</th>
                          <th className="py-3 px-3">Vitals (BP / Hb / BS)</th>
                          <th className="py-3 px-3">Risk Level</th>
                          <th className="py-3 px-3">AI Explainability</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/15 text-xs">
                        {filteredMothers.map((mother) => (
                          <tr
                            key={mother.id}
                            className="hover:bg-surface-container-low/60 transition-colors"
                          >
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-on-surface">{mother.name}</div>
                              <div className="text-[11px] text-on-surface-variant">
                                {mother.id} • Age {mother.age} • {mother.village}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 font-semibold">
                              W{mother.gestationalWeek} (T{mother.trimester})
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-on-surface">
                                BP: {mother.bloodPressure}
                              </div>
                              <div className="text-[11px] text-on-surface-variant">
                                Hb: {mother.hemoglobin} g/dL • BS: {mother.bloodSugar ?? 5.2} mmol/L
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <RiskBadge level={mother.riskLevel} />
                            </td>
                            <td className="py-3.5 px-3 max-w-xs">
                              <div className="flex flex-wrap gap-1">
                                {(mother.aiExplainability || [mother.riskReason]).map((f, i) => (
                                  <span
                                    key={i}
                                    className="text-[11px] px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => handleOpenAnc(mother)}
                                className="text-xs font-bold text-primary-container hover:underline"
                              >
                                + Visit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenProfile(mother)}
                                className="text-xs font-bold text-secondary hover:underline"
                              >
                                Review Case →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Emergency Dispatch & Live Analytics */}
            <div className="space-y-6" id="analytics">
              <div className="rounded-2xl bg-gradient-to-br from-primary-container to-primary text-on-primary p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-error text-on-error text-[10px] font-extrabold uppercase tracking-wider">
                    108 Emergency Dispatch
                  </span>
                  <span className="material-symbols-outlined text-secondary-fixed">
                    emergency_share
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold">
                    Instant FRU Ambulance Referral
                  </h3>
                  <p className="text-xs text-primary-fixed/80 mt-1">
                    Connects high-risk mothers directly with 108 ALS ambulance and Civil Hospital Ob-Gyn Unit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenSos()}
                  className="w-full py-2.5 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed text-xs font-extrabold shadow-md hover:opacity-95 transition-all"
                >
                  Trigger 108 Ambulance Now
                </button>
              </div>

              {/* Dynamic Trimester Breakdown */}
              <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/20 space-y-4">
                <h3 className="text-sm font-extrabold text-primary-container uppercase tracking-wider">
                  Cohort Trimester Distribution ({totalCount})
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>1st Trimester (Weeks 1–12)</span>
                      <span className="text-secondary">{t1Count} ({t1Pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${t1Pct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>2nd Trimester (Weeks 13–26)</span>
                      <span className="text-primary-container">{t2Count} ({t2Pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary-container rounded-full" style={{ width: `${t2Pct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>3rd Trimester (Weeks 27–40)</span>
                      <span className="text-tertiary">{t3Count} ({t3Pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary rounded-full" style={{ width: `${t3Pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Village Caseload */}
              <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/20 space-y-4">
                <h3 className="text-sm font-extrabold text-primary-container uppercase tracking-wider">
                  Village Caseload Breakdown
                </h3>
                {villageMap.size === 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    No village data yet. Register or import mothers to view village distribution.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Array.from(villageMap.entries()).map(([vName, stats]) => (
                      <div
                        key={vName}
                        className="p-3 rounded-xl bg-surface-container-low space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-on-surface">{vName}</span>
                          <span className="font-extrabold text-error">
                            {stats.highRisk} High-Risk / {stats.total} Total
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <EmergencySosModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        initialMother={selectedMother}
      />
      <RegisterMotherModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
      />
      <RecordAncVisitModal
        isOpen={ancModalOpen}
        onClose={() => setAncModalOpen(false)}
        initialMother={selectedMother}
      />
      <MotherProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        mother={selectedMother}
        onOpenAncModal={(m) => handleOpenAnc(m)}
        onOpenSosModal={(m) => handleOpenSos(m)}
      />
    </div>
  );
}
