'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { StatCard } from '@/components/StatCard';
import { RiskBadge } from '@/components/RiskBadge';
import { EmergencySosModal } from '@/components/EmergencySosModal';
import { RegisterMotherModal } from '@/components/RegisterMotherModal';
import { RecordAncVisitModal } from '@/components/RecordAncVisitModal';
import { MOCK_MOTHERS, MOCK_VILLAGE_CASELOAD } from '@/data/mockData';
import { MotherRecord, RiskLevel } from '@/types';

export default function SupervisorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [mothersList, setMothersList] = useState<MotherRecord[]>(MOCK_MOTHERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | RiskLevel>('ALL');

  // Modals state
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [ancModalOpen, setAncModalOpen] = useState(false);
  const [activeMotherForAction, setActiveMotherForAction] = useState<MotherRecord | null>(null);

  // Filtered mothers for surveillance table
  const filteredMothers = mothersList.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.village.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk =
      selectedRiskFilter === 'ALL' || m.riskLevel === selectedRiskFilter;

    return matchesSearch && matchesRisk;
  });

  const handleOpenSos = (mother?: MotherRecord) => {
    setActiveMotherForAction(mother || null);
    setSosModalOpen(true);
  };

  const handleOpenAnc = (mother: MotherRecord) => {
    setActiveMotherForAction(mother);
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

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Sidebar for navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenSosModal={() => handleOpenSos()}
      />

      {/* Main Wrapper shifted on desktop for sidebar */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Global Header */}
        <Header
          currentRole="supervisor"
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSosModal={() => handleOpenSos()}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
          {/* Top Command Welcome Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-bold">
                  NHM Clinical Node #412
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span className="text-xs text-secondary font-bold">
                  Real-Time Sync Active
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-primary-container tracking-tight">
                Good Morning, Dr. Priya Sharma (Medical Supervisor)
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant">
                Surveillance overview across Rampura, Badgaon, Girwa & Savina PHC Sectors.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center bg-surface-container-low px-3 py-2 rounded-xl text-on-surface text-xs font-semibold shadow-xs border border-outline-variant/20">
                <span className="material-symbols-outlined text-[16px] mr-1.5 text-on-surface-variant">
                  calendar_month
                </span>
                <span>October 2026</span>
              </div>

              <button
                type="button"
                onClick={() => alert('NHM Monthly Surveillance Report downloaded as PDF.')}
                className="flex items-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-primary-container px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[16px]">
                  sim_card_download
                </span>
                <span>Export NHM Report</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenSos()}
                className="flex items-center gap-2 bg-error text-on-error px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-error/90 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">
                  e911_emergency
                </span>
                <span>Urgent Escalation (12)</span>
              </button>
            </div>
          </div>

          {/* 4 High-Impact Stat Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Total Registered Mothers"
              value="1,240"
              trend={{ text: '8.4%', positive: true }}
              icon="pregnant_woman"
              accentColor="secondary"
              footerLeft="142 added this cycle"
              footerRight="98.2% Verified ID"
            />

            <StatCard
              title="High-Risk Cases"
              value="86"
              subValue="6.9% total"
              leftBorderColor="bg-error"
              badge={{ text: 'Critical', variant: 'error' }}
              icon="emergency"
              accentColor="error"
              tags={[
                { label: '28 Pre-eclampsia', color: 'text-error' },
                { label: '34 Sev Anemia', color: 'text-error' },
                { label: '24 GDM', color: 'text-error' },
              ]}
            />

            <StatCard
              title="Active ASHA Field Force"
              value="28"
              subValue="28 / 29 Active"
              icon="diversity_1"
              accentColor="primary"
              footerLeft="24 tribal & rural villages"
              footerRight="96.4% On-field presence"
            />

            <StatCard
              title="Overdue ANC Visits"
              value="34"
              subValue="Escalate Now"
              leftBorderColor="bg-tertiary-container"
              badge={{ text: 'Escalate Now', variant: 'tertiary' }}
              icon="event_busy"
              accentColor="tertiary"
              footerLeft="Requires supervisor action"
              footerRight="19 Critical Window"
            />
          </div>

          {/* Charts & Analytics Grid (2x2) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="analytics">
            {/* Viz 1: Monthly Registrations Trend (7 cols) */}
            <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base text-primary-container">
                    Pregnancy Registrations Trend
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Last 6 Months (May – Oct 2026) across 4 PHC Clusters
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-2.5 h-2.5 rounded bg-secondary" /> Actual Intake
                </div>
              </div>

              {/* Trend Bars */}
              <div className="pt-4 pb-2">
                <div className="h-44 w-full flex items-end justify-between gap-3 px-2">
                  {[
                    { month: 'May', count: 180, height: '56%' },
                    { month: 'Jun', count: 210, height: '65%' },
                    { month: 'Jul', count: 245, height: '76%' },
                    { month: 'Aug', count: 230, height: '71%' },
                    { month: 'Sep', count: 290, height: '90%' },
                    { month: 'Oct', count: 320, height: '100%', peak: true },
                  ].map((item) => (
                    <div
                      key={item.month}
                      className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                    >
                      <span
                        className={`text-[11px] font-bold ${
                          item.peak
                            ? 'text-secondary opacity-100'
                            : 'text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity'
                        }`}
                      >
                        {item.count}
                      </span>
                      <div
                        className={`w-full max-w-[44px] rounded-t-lg transition-all ${
                          item.peak
                            ? 'bg-secondary relative shadow-sm'
                            : 'bg-surface-container-high group-hover:bg-secondary/70'
                        }`}
                        style={{ height: item.height }}
                      >
                        {item.peak && (
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-tertiary-fixed ring-2 ring-white" />
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          item.peak ? 'text-primary-container font-bold' : 'text-on-surface-variant'
                        }`}
                      >
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-on-surface-variant pt-3 border-t border-outline-variant/15 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  +34.2% Growth in Q3
                </span>
                <span className="text-secondary font-bold">
                  Peak seasonal intake detected in October
                </span>
              </div>
            </div>

            {/* Viz 2: ANC Visit Completion Gauge (5 cols) */}
            <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-primary-container">
                    ANC Visit Completion
                  </h3>
                  <p className="text-xs text-on-surface-variant">Mandatory 4-Checklist Coverage</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-secondary-container/40 text-on-secondary-container text-xs font-bold">
                  Target: 80%
                </span>
              </div>

              <div className="my-4 flex flex-col sm:flex-row items-center justify-center gap-6">
                {/* Circular Donut Gauge */}
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-surface-container"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-secondary"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="82.6, 100"
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-extrabold text-primary-container leading-none">
                      82.6%
                    </span>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-1 font-bold">
                      Completed
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-on-surface-variant font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="text-on-surface font-semibold">ANC 1 (Wk 12):</span> 96.2%
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="text-on-surface font-semibold">ANC 2 (Wk 20):</span> 88.5%
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="text-on-surface font-semibold">ANC 3 (Wk 28):</span> 79.1%
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim" />
                    <span className="text-on-surface font-semibold">ANC 4 (Wk 36):</span> 66.8%
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-xs font-semibold">
                <span className="text-on-surface-variant">Focus needed:</span>
                <span className="text-error font-bold">
                  14 mothers past Week 36 due for ANC 4
                </span>
              </div>
            </div>

            {/* Viz 3: Maternal Risk Stratification (6 cols) */}
            <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/20 flex flex-col justify-between" id="high-risk">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-base text-primary-container">
                    Maternal Risk Stratification
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Clinical categorization based on vitals & obstetric history
                  </p>
                </div>
                <span className="text-xs text-on-surface-variant font-semibold">
                  1,240 Total Cohort
                </span>
              </div>

              {/* Stacked bar */}
              <div className="space-y-1.5 py-3">
                <div className="h-4 w-full rounded-full bg-surface-container overflow-hidden flex shadow-inner">
                  <div
                    className="bg-secondary h-full transition-all"
                    style={{ width: '78%' }}
                    title="Low Risk: 78%"
                  />
                  <div
                    className="bg-tertiary-fixed-dim h-full transition-all"
                    style={{ width: '15%' }}
                    title="Moderate Risk: 15%"
                  />
                  <div
                    className="bg-error h-full transition-all"
                    style={{ width: '7%' }}
                    title="High Risk: 7%"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-bold px-1">
                  <span>0%</span>
                  <span>78% Low</span>
                  <span>93% Mod</span>
                  <span className="text-error">100% High (7%)</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-secondary-container/20 border border-secondary-container/40">
                  <div className="flex items-center gap-1.5 text-secondary text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-secondary" /> Low Risk
                  </div>
                  <p className="text-xl font-extrabold text-primary-container mt-1">967</p>
                  <span className="text-[11px] text-on-surface-variant">78% of mothers</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <div className="flex items-center gap-1.5 text-tertiary text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-tertiary" /> Moderate
                  </div>
                  <p className="text-xl font-extrabold text-primary-container mt-1">187</p>
                  <span className="text-[11px] text-on-surface-variant">15% under watch</span>
                </div>

                <div className="p-3 rounded-xl bg-error-container/30 border border-error-container/60">
                  <div className="flex items-center gap-1.5 text-error text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-error" /> High Risk
                  </div>
                  <p className="text-xl font-extrabold text-error mt-1">86</p>
                  <span className="text-[11px] text-error font-semibold">7% strict care</span>
                </div>
              </div>
            </div>

            {/* Viz 4: Village-wise Caseload (6 cols) */}
            <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-base text-primary-container">
                    Village Cluster Caseload
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Active registration distribution across primary sub-centers
                  </p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                  location_on
                </span>
              </div>

              <div className="space-y-3 py-1">
                {MOCK_VILLAGE_CASELOAD.map((village) => (
                  <div key={village.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-on-surface">{village.name}</span>
                      <span className="text-on-surface-variant font-medium">
                        {village.totalMothers} mothers{' '}
                        <span className="text-error font-bold">
                          ({village.highRisk} High-Risk)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="bg-primary-container h-full rounded-full transition-all"
                        style={{ width: `${village.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-right text-xs text-secondary font-bold">
                All 4 sectors connected via Mobile ANM & ASHA App
              </div>
            </div>
          </div>

          {/* High-Priority Mothers Clinical Surveillance Table Section */}
          <div
            className="bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/20 overflow-hidden"
            id="roster"
          >
            {/* Table Header Controls */}
            <div className="p-6 bg-surface-container-lowest flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-outline-variant/15">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-primary-container">
                    Mothers Surveillance Roster
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary text-xs font-bold">
                    Active Cohort ({filteredMothers.length})
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Real-time clinical vitals, risk escalations, and assigned ASHA field contacts.
                </p>
              </div>

              {/* Search + Filter Chips + Add CTA */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative min-w-[240px]">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-on-surface-variant">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, Name, Village..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant text-xs font-medium focus:outline-none focus:bg-surface-container-lowest border border-outline-variant/30"
                  />
                </div>

                {/* Risk Filter Buttons */}
                <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setSelectedRiskFilter('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedRiskFilter === 'ALL'
                        ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRiskFilter('HIGH')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedRiskFilter === 'HIGH'
                        ? 'bg-error text-on-error font-bold shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    High Risk
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRiskFilter('MODERATE')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedRiskFilter === 'MODERATE'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed font-bold shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Moderate
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRiskFilter('LOW')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedRiskFilter === 'LOW'
                        ? 'bg-secondary text-on-secondary font-bold shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Low
                  </button>
                </div>

                {/* Add New Record CTA */}
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(true)}
                  className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/90 text-on-secondary px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  <span>Add New Record</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase tracking-wider font-bold border-b border-outline-variant/15">
                  <tr>
                    <th scope="col" className="py-3 px-4">Mother ID</th>
                    <th scope="col" className="py-3 px-4">Name & Age</th>
                    <th scope="col" className="py-3 px-4">Village / Sector</th>
                    <th scope="col" className="py-3 px-4">Gestational Age</th>
                    <th scope="col" className="py-3 px-4">Vital Signs / Flags</th>
                    <th scope="col" className="py-3 px-4">Risk Status</th>
                    <th scope="col" className="py-3 px-4">Assigned ASHA</th>
                    <th scope="col" className="py-3 px-4 text-right">Clinical Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredMothers.map((mother) => (
                    <tr
                      key={mother.id}
                      className="hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest"
                    >
                      {/* Mother ID */}
                      <td className="py-3 px-4 font-bold text-primary-container whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-surface-container-high font-mono">
                          {mother.id}
                        </span>
                      </td>

                      {/* Name & Age */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-on-surface text-sm">
                          {mother.name}
                        </div>
                        <div className="text-[11px] text-on-surface-variant">
                          {mother.age} yrs • {mother.gravidaPara}
                        </div>
                      </td>

                      {/* Village / Sector */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-on-surface">{mother.village}</span>
                        <span className="block text-[11px] text-on-surface-variant">
                          {mother.ward}
                        </span>
                      </td>

                      {/* Gestational Age */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-primary-container">
                          Week {mother.gestationalWeek}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
                          Trimester {mother.trimester}
                        </span>
                      </td>

                      {/* Vital Signs / Flags */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              mother.riskLevel === 'HIGH'
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-surface-container text-on-surface'
                            }`}
                          >
                            BP {mother.bloodPressure}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              mother.hemoglobin < 9
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-surface-container text-on-surface'
                            }`}
                          >
                            Hb {mother.hemoglobin} g/dL
                          </span>
                        </div>
                      </td>

                      {/* Risk Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <RiskBadge level={mother.riskLevel} />
                      </td>

                      {/* Assigned ASHA */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-on-surface">
                          {mother.assignedAsha.name}
                        </div>
                        <a
                          href={`tel:${mother.assignedAsha.phone.replace(/[^0-9]/g, '')}`}
                          className="text-[11px] text-secondary font-bold hover:underline"
                        >
                          {mother.assignedAsha.phone}
                        </a>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAnc(mother)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-secondary hover:text-on-secondary text-primary-container font-bold text-xs transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              clinical_notes
                            </span>
                            <span>Record ANC</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenSos(mother)}
                            className="p-1.5 rounded-lg bg-error-container text-error hover:bg-error hover:text-on-error transition-colors"
                            title="Urgent 108 Dispatch"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              e911_emergency
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Shared Modals */}
      <EmergencySosModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        initialMother={activeMotherForAction}
      />

      <RegisterMotherModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSave={handleMotherAdded}
      />

      {activeMotherForAction && (
        <RecordAncVisitModal
          isOpen={ancModalOpen}
          onClose={() => setAncModalOpen(false)}
          mother={activeMotherForAction}
          onSaved={handleMotherUpdated}
        />
      )}
    </div>
  );
}
