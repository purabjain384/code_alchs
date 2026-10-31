'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { HindiAudioPlayer } from '@/components/HindiAudioPlayer';
import Sidebar from '@/components/Sidebar';
import {
  AuthUser,
  MotherRecord,
  NavTab,
  VisitRecord,
} from '@/types';
import {
  evaluateAncVisit,
  fetchAllVisits,
  fetchSingleMother,
} from '@/lib/api';

const SYMPTOM_OPTIONS = [
  'severe headache',
  'blurred vision',
  'vaginal bleeding',
  'severe abdominal pain',
  'reduced fetal movement',
];

export default function HomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Mother's Live Profile & Visit History from Backend (zero hardcoded values)
  const [myProfile, setMyProfile] = useState<MotherRecord | null>(null);
  const [myVisits, setMyVisits] = useState<VisitRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // New Checkup Form State — ONLY asks for vitals that change per checkup (all start empty "")
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [bsUnit, setBsUnit] = useState<'mmol' | 'mgdl'>('mmol');
  const [bodyTemp, setBodyTemp] = useState('');
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>('F');
  const [heartRate, setHeartRate] = useState('');
  const [hemoglobin, setHemoglobin] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  // Analysis -> Result State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeResult, setActiveResult] = useState<VisitRecord | null>(null);

  // Restore session if present and valid (must include mother_id & age)
  useEffect(() => {
    const saved = localStorage.getItem('matruraksha_auth_user_v2');
    if (saved) {
      try {
        const parsed: AuthUser = JSON.parse(saved);
        if (parsed && parsed.mother_id && parsed.age) {
          setUser(parsed);
        } else {
          localStorage.removeItem('matruraksha_auth_user_v2');
        }
      } catch {
        localStorage.removeItem('matruraksha_auth_user_v2');
      }
    }
  }, []);

  const loadMotherData = useCallback(async (currentUser: AuthUser) => {
    setLoadingData(true);
    try {
      const [profile, visitsList] = await Promise.all([
        fetchSingleMother(currentUser.mother_id).catch(() => null),
        fetchAllVisits(100, currentUser.mother_id),
      ]);
      if (profile) setMyProfile(profile);
      setMyVisits(visitsList);
    } catch (err) {
      console.error('Error loading mother data:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadMotherData(user);
    }
  }, [user, loadMotherData]);

  const resetVitalsForm = () => {
    setSystolic('');
    setDiastolic('');
    setBloodSugar('');
    setBodyTemp('');
    setHeartRate('');
    setHemoglobin('');
    setSelectedSymptoms([]);
    setRemarks('');
    setFormError('');
  };

  const handleOpenNewForm = () => {
    resetVitalsForm();
    setActiveTab('new-form');
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError('');

    const sysNum = Number(systolic);
    const diaNum = Number(diastolic);
    const bsRaw = Number(bloodSugar);
    const tempRaw = Number(bodyTemp);
    const hrNum = Number(heartRate);

    if (!systolic || isNaN(sysNum) || sysNum < 70 || sysNum > 220) {
      setFormError('Please enter Systolic BP between 70 and 220 mmHg.');
      return;
    }
    if (!diastolic || isNaN(diaNum) || diaNum < 40 || diaNum > 150) {
      setFormError('Please enter Diastolic BP between 40 and 150 mmHg.');
      return;
    }
    if (!bloodSugar || isNaN(bsRaw) || bsRaw <= 0) {
      setFormError('Please enter your Blood Sugar reading.');
      return;
    }
    if (!bodyTemp || isNaN(tempRaw) || tempRaw <= 0) {
      setFormError('Please enter your Body Temperature reading.');
      return;
    }
    if (!heartRate || isNaN(hrNum) || hrNum < 40 || hrNum > 200) {
      setFormError('Please enter your Heart Rate between 40 and 200 bpm.');
      return;
    }

    const bsMmol = bsUnit === 'mgdl' ? Number((bsRaw / 18.0).toFixed(2)) : bsRaw;
    const tempF = tempUnit === 'C' ? Number(((tempRaw * 9) / 5 + 32).toFixed(1)) : tempRaw;

    setIsAnalyzing(true);

    try {
      const response = await evaluateAncVisit({
        mother_id: user.mother_id,
        age: user.age,
        gestational_age_weeks: user.gestational_week ?? undefined,
        vitals: {
          systolic: sysNum,
          diastolic: diaNum,
          blood_sugar_mmol: bsMmol,
          body_temp_f: tempF,
          heart_rate: hrNum,
          hemoglobin: hemoglobin ? Number(hemoglobin) : undefined,
          remarks: remarks.trim() || undefined,
        },
        symptoms: selectedSymptoms,
      });

      setActiveResult(response);
      setIsAnalyzing(false);
      setActiveTab('result');
      loadMotherData(user).catch(console.error);
    } catch (err) {
      setIsAnalyzing(false);
      setFormError(err instanceof Error ? err.message : 'Evaluation failed.');
    }
  };

  // 1. MANDATORY AUTH GATE FIRST (Collects Name, Age, Phone once on Sign Up)
  if (!user) {
    return (
      <AuthGate
        onAuthenticated={(loggedInUser) => {
          localStorage.setItem('matruraksha_auth_user_v2', JSON.stringify(loggedInUser));
          setUser(loggedInUser);
        }}
      />
    );
  }

  const latestVisit = myVisits[0] || null;
  const currentRisk = myProfile?.riskLevel || latestVisit?.frontend_risk_level || 'UNASSESSED';

  const badgeStyle = (risk: string) => {
    if (risk === 'HIGH' || risk === 'high')
      return 'bg-red-100 text-red-800 border-red-200';
    if (risk === 'MODERATE' || risk === 'mid')
      return 'bg-amber-100 text-amber-800 border-amber-200';
    if (risk === 'LOW' || risk === 'low')
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'new-form') {
            handleOpenNewForm();
          } else {
            setActiveTab(tab);
          }
        }}
        user={user}
        onLogout={() => {
          localStorage.removeItem('matruraksha_auth_user_v2');
          setUser(null);
          setMyProfile(null);
          setMyVisits([]);
          setActiveResult(null);
        }}
        visitsCount={myVisits.length}
      />

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        {activeTab === 'dashboard' ? (
          /* ==================== VIEW 1: MOTHER'S DASHBOARD ==================== */
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Hello, {user.name}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Age {user.age} yrs
                  {user.gestational_week ? ` • Pregnancy Week ${user.gestational_week}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewForm}
                className="px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-xs transition cursor-pointer"
              >
                + New Checkup
              </button>
            </div>

            {/* Mother's Personal Summary Cards (Purely from Backend DB) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Current Risk Status
                </p>
                <div className="mt-2.5">
                  <span
                    className={`inline-block text-sm font-bold px-3 py-1 rounded-full border ${badgeStyle(
                      currentRisk
                    )}`}
                  >
                    {currentRisk}
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  My Recorded Checkups
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{myVisits.length}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Latest Blood Pressure
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
                  {latestVisit
                    ? `${latestVisit.vitals.systolic}/${latestVisit.vitals.diastolic} mmHg`
                    : 'Not recorded'}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  BP Trend Status
                </p>
                <p
                  className={`text-sm font-bold mt-2.5 ${
                    latestVisit?.trend_flag ? 'text-amber-700' : 'text-slate-700'
                  }`}
                >
                  {latestVisit?.trend_flag === 'bp_rising_3_visits'
                    ? 'Rising across 3 checkups'
                    : myVisits.length > 0
                    ? 'Stable / Normal'
                    : 'Awaiting first checkup'}
                </p>
              </div>
            </div>

            {/* Latest Hindi & English Health Advisory if she has at least 1 checkup */}
            {latestVisit && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Latest Health Summary (English)
                  </h2>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {latestVisit.english_summary}
                  </p>
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    आपकी नवीनतम स्वास्थ्य सलाह (Hindi)
                  </h2>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {latestVisit.hindi_text}
                  </p>
                  <HindiAudioPlayer
                    text={latestVisit.hindi_text}
                    initialAudioBase64={latestVisit.audio_base64}
                    title="आवाज में सलाह सुनें"
                  />
                </div>
              </div>
            )}

            {/* Mother's Recent Checkups Table Below Dashboard */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  My Checkup History
                </h2>
                {myVisits.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
                  >
                    View All ({myVisits.length})
                  </button>
                )}
              </div>

              {loadingData ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Loading your checkup records...
                </div>
              ) : myVisits.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm text-slate-600 mb-4">
                    You have not recorded any checkup readings yet.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenNewForm}
                    className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition cursor-pointer"
                  >
                    + Enter Your First Checkup Readings
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">My Vitals (BP / BS / Temp / HR)</th>
                        <th className="py-3 px-4">Risk Level</th>
                        <th className="py-3 px-4">Key Driving Factors</th>
                        <th className="py-3 px-4">Flags / Trend</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {myVisits.slice(0, 8).map((v) => (
                        <tr key={v.visit_id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            {new Date(v.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                            BP {v.vitals.systolic}/{v.vitals.diastolic} mmHg • BS{' '}
                            {v.vitals.blood_sugar_mmol} mmol/L • {v.vitals.body_temp_f}°F •{' '}
                            {v.vitals.heart_rate} bpm
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${badgeStyle(
                                v.frontend_risk_level
                              )}`}
                            >
                              {v.frontend_risk_level}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-700 font-medium">
                            {v.top_factors.join(', ')}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            {[
                              ...(v.rule_flags || []),
                              ...(v.trend_flag ? [v.trend_flag] : []),
                            ].join(', ') || 'Normal'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveResult(v);
                                setActiveTab('result');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-700 hover:text-white text-xs font-semibold text-slate-700 transition cursor-pointer"
                            >
                              View Result
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'new-form' ? (
          /* ==================== VIEW 2: NEW CHECKUP FORM (ZERO REDUNDANT FIELDS) ==================== */
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <div className="mb-6 pb-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  New Checkup Readings
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Recording vitals for <strong>{user.name}</strong> (Age {user.age} yrs
                  {user.gestational_week ? `, Week ${user.gestational_week}` : ''})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitAssessment} className="space-y-6">
              {/* Only Vitals That Change Per Checkup — No Redundant Name/Age/Phone Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Systolic BP (Upper, mmHg) *
                  </label>
                  <input
                    type="number"
                    required
                    min={70}
                    max={220}
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    placeholder="70 – 220 mmHg"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diastolic BP (Lower, mmHg) *
                  </label>
                  <input
                    type="number"
                    required
                    min={40}
                    max={150}
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    placeholder="40 – 150 mmHg"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Blood Sugar (BS) *
                    </label>
                    <select
                      value={bsUnit}
                      onChange={(e) => setBsUnit(e.target.value as 'mmol' | 'mgdl')}
                      className="text-xs border border-slate-300 rounded-md px-1.5 py-0.5 bg-slate-50"
                    >
                      <option value="mmol">mmol/L</option>
                      <option value="mgdl">mg/dL</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={bloodSugar}
                    onChange={(e) => setBloodSugar(e.target.value)}
                    placeholder={
                      bsUnit === 'mmol'
                        ? 'Enter in mmol/L (2.0 – 35.0)'
                        : 'Enter in mg/dL (40 – 500)'
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Body Temperature *
                    </label>
                    <select
                      value={tempUnit}
                      onChange={(e) => setTempUnit(e.target.value as 'F' | 'C')}
                      className="text-xs border border-slate-300 rounded-md px-1.5 py-0.5 bg-slate-50"
                    >
                      <option value="F">°F</option>
                      <option value="C">°C</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={bodyTemp}
                    onChange={(e) => setBodyTemp(e.target.value)}
                    placeholder={
                      tempUnit === 'F'
                        ? 'Enter in °F (95.0 – 106.0)'
                        : 'Enter in °C (35.0 – 41.0)'
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Heart Rate (Pulse, bpm) *
                  </label>
                  <input
                    type="number"
                    required
                    min={40}
                    max={200}
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="40 – 200 bpm"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hemoglobin g/dL (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={3}
                    max={20}
                    value={hemoglobin}
                    onChange={(e) => setHemoglobin(e.target.value)}
                    placeholder="Optional (if tested today)"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Optional Danger Symptoms & Notes */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Are you experiencing any of these symptoms today? (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOM_OPTIONS.map((sym) => {
                    const checked = selectedSymptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() =>
                          setSelectedSymptoms((prev) =>
                            checked ? prev.filter((s) => s !== sym) : [...prev, sym]
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          checked
                            ? 'bg-red-50 border-red-300 text-red-800'
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {checked ? '✓ ' : '+ '}
                        {sym}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="How are you feeling today?"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-teal-900 text-white font-semibold text-sm shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Evaluating your checkup...</span>
                  </>
                ) : (
                  'Analyze My Checkup →'
                )}
              </button>
            </form>
          </div>
        ) : activeTab === 'result' && activeResult ? (
          /* ==================== VIEW 3: CHECKUP RESULT ==================== */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-bold border ${badgeStyle(
                      activeResult.frontend_risk_level
                    )}`}
                  >
                    {activeResult.frontend_risk_level} RISK
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mt-2">
                  Your Checkup Result
                </h1>
                <p className="text-xs text-slate-500">
                  Checked on {new Date(activeResult.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleOpenNewForm}
                  className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition cursor-pointer"
                >
                  + New Checkup
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  Back to My Dashboard
                </button>
              </div>
            </div>

            {/* Recorded Vitals + Risk Breakdown + Key Vitals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Your Readings Today
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-500">Blood Pressure</p>
                    <p className="font-bold text-slate-900">
                      {activeResult.vitals.systolic}/{activeResult.vitals.diastolic} mmHg
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-500">Blood Sugar</p>
                    <p className="font-bold text-slate-900">
                      {activeResult.vitals.blood_sugar_mmol} mmol/L
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-500">Body Temp</p>
                    <p className="font-bold text-slate-900">
                      {activeResult.vitals.body_temp_f} °F
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-500">Heart Rate</p>
                    <p className="font-bold text-slate-900">
                      {activeResult.vitals.heart_rate} bpm
                    </p>
                  </div>
                </div>
              </div>

              {/* Risk Confidence Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Risk Assessment Breakdown
                </h2>
                {(['high', 'mid', 'low'] as const).map((cls) => {
                  const pct = Math.round((activeResult.probabilities?.[cls] || 0) * 100);
                  const barColor =
                    cls === 'high'
                      ? 'bg-red-600'
                      : cls === 'mid'
                      ? 'bg-amber-500'
                      : 'bg-emerald-600';
                  return (
                    <div key={cls}>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="uppercase">
                          {cls === 'mid' ? 'Moderate' : cls} Risk
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500">Key Vitals Influencing Result:</p>
                  <div className="flex gap-2 mt-1.5">
                    {activeResult.top_factors.map((f) => (
                      <span
                        key={f}
                        className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Safety Alerts & Blood Pressure Trend */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Health Alerts & BP Trend
                </h2>
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-1.5">
                    Vital Threshold Checks:
                  </p>
                  {activeResult.rule_flags.length === 0 ? (
                    <p className="text-xs text-emerald-700 font-medium">
                      All readings are within normal thresholds.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {activeResult.rule_flags.map((flag) => (
                        <span
                          key={flag}
                          className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700"
                        >
                          {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 mb-1">
                    Blood Pressure Trend:
                  </p>
                  <p className="text-xs text-slate-700">{activeResult.trend_summary}</p>
                  {activeResult.trend_flag && (
                    <span className="inline-block mt-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                      Rising BP across your last 3 checkups
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bilingual Clinical Advisory & Hindi Audio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recommended Care & Next Steps (English)
                </h2>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {activeResult.english_summary}
                </p>
                <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pt-2">
                  {activeResult.action_items_en.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  आपकी स्वास्थ्य सलाह और ऑडियो (Hindi)
                </h2>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {activeResult.hindi_text}
                </p>
                <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pt-1">
                  {activeResult.action_items_hi.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <HindiAudioPlayer
                  text={activeResult.hindi_text}
                  initialAudioBase64={activeResult.audio_base64}
                  title="आज की जांच सलाह (Hindi Audio)"
                />
              </div>
            </div>
          </div>
        ) : (
          /* ==================== VIEW 4: MY CHECKUP HISTORY (LEFT SIDEBAR) ==================== */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">My Checkup History</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  All past checkups recorded for {user.name} (Age {user.age})
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewForm}
                className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition cursor-pointer"
              >
                + New Checkup Form
              </button>
            </div>

            {myVisits.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No checkups recorded yet. Click &ldquo;+ New Checkup Form&rdquo; to evaluate your first checkup.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Readings (BP / BS / Temp / HR)</th>
                      <th className="py-3 px-4">Risk & Probabilities</th>
                      <th className="py-3 px-4">Top Factors & Flags</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {myVisits.map((v) => (
                      <tr key={v.visit_id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {new Date(v.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                          BP {v.vitals.systolic}/{v.vitals.diastolic} • BS{' '}
                          {v.vitals.blood_sugar_mmol} • {v.vitals.body_temp_f}°F • HR{' '}
                          {v.vitals.heart_rate}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeStyle(
                              v.frontend_risk_level
                            )}`}
                          >
                            {v.frontend_risk_level}
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-1">
                            H: {Math.round((v.probabilities?.high || 0) * 100)}% • M:{' '}
                            {Math.round((v.probabilities?.mid || 0) * 100)}% • L:{' '}
                            {Math.round((v.probabilities?.low || 0) * 100)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          <div>Factors: {v.top_factors.join(', ')}</div>
                          {(v.rule_flags.length > 0 || v.trend_flag) && (
                            <div className="text-red-700 font-medium mt-0.5">
                              {[...v.rule_flags, ...(v.trend_flag ? [v.trend_flag] : [])].join(
                                ', '
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveResult(v);
                              setActiveTab('result');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-700 hover:text-white text-xs font-semibold text-slate-700 transition cursor-pointer"
                          >
                            Open Result
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
