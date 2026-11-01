'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import SupervisorCharts from '@/components/SupervisorCharts';
import { MOCK_PATIENT, MOCK_VISITS, Risk } from '@/data/supervisorMockData';

const badgeStyle = (risk: Risk) =>
  risk === 'HIGH'
    ? 'bg-red-100 text-red-800 border-red-200'
    : risk === 'MODERATE'
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-emerald-100 text-emerald-800 border-emerald-200';

export default function SupervisorPage() {
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const latest = MOCK_VISITS[MOCK_VISITS.length - 1];
  const first = MOCK_VISITS[0];
  const history = [...MOCK_VISITS].reverse();

  const stats = [
    {
      label: 'Blood pressure',
      value: `${latest.systolic}/${latest.diastolic}`,
      unit: 'mmHg',
      bad: latest.systolic >= 140,
    },
    { label: 'Blood sugar', value: String(latest.sugar), unit: 'mmol/L', bad: latest.sugar >= 7.8 },
    { label: 'Hemoglobin', value: String(latest.hemoglobin), unit: 'g/dL', bad: latest.hemoglobin < 11 },
    {
      label: 'Weight gain',
      value: `+${(latest.weight - first.weight).toFixed(1)}`,
      unit: 'kg',
      bad: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-5xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Supervisor view
            </p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{MOCK_PATIENT.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Age {MOCK_PATIENT.age} yrs • Week {MOCK_PATIENT.currentWeek} • Due {MOCK_PATIENT.edd} •
              ASHA: {MOCK_PATIENT.asha}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-bold px-3 py-1 rounded-full border ${badgeStyle(MOCK_PATIENT.risk)}`}
            >
              {MOCK_PATIENT.risk}
            </span>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-sm font-semibold text-slate-700 transition"
            >
              Back to app
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white p-5 rounded-2xl border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className={`mt-2 text-2xl font-bold ${s.bad ? 'text-red-700' : 'text-slate-900'}`}>
                {s.value} <span className="text-sm font-medium text-slate-500">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Assessment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Assessment</h2>
          <p className="text-sm text-slate-700 mt-2 leading-relaxed">{MOCK_PATIENT.riskReason}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-4">
            Recommended
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700 list-disc list-inside">
            {MOCK_PATIENT.actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>

        {/* Chart */}
        <SupervisorCharts visits={MOCK_VISITS} />

        {/* History */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Checkup history{' '}
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                {MOCK_VISITS.length}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="px-5 py-3 font-semibold">Week</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">BP</th>
                  <th className="px-5 py-3 font-semibold">Sugar</th>
                  <th className="px-5 py-3 font-semibold">Hb</th>
                  <th className="px-5 py-3 font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((v) => {
                  const open = openWeek === v.week;
                  return (
                    <React.Fragment key={v.week}>
                      <tr
                        onClick={() => setOpenWeek(open ? null : v.week)}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <td className="px-5 py-3 font-semibold">Wk {v.week}</td>
                        <td className="px-5 py-3 text-slate-600">{v.date}</td>
                        <td className={`px-5 py-3 ${v.systolic >= 140 ? 'text-red-700 font-semibold' : ''}`}>
                          {v.systolic}/{v.diastolic}
                        </td>
                        <td className="px-5 py-3">{v.sugar}</td>
                        <td className={`px-5 py-3 ${v.hemoglobin < 11 ? 'text-red-700 font-semibold' : ''}`}>
                          {v.hemoglobin}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeStyle(v.risk)}`}
                          >
                            {v.risk}
                          </span>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="px-5 py-4 text-sm text-slate-700 space-y-1">
                            <p>
                              <span className="text-slate-500">Recorded by:</span> {v.by}
                            </p>
                            <p>
                              <span className="text-slate-500">Heart rate:</span> {v.heartRate} bpm •{' '}
                              <span className="text-slate-500">Temp:</span> {v.tempF}°F •{' '}
                              <span className="text-slate-500">Fetal HR:</span> {v.fetalHr} bpm •{' '}
                              <span className="text-slate-500">Weight:</span> {v.weight} kg
                            </p>
                            <p>
                              <span className="text-slate-500">Symptoms:</span>{' '}
                              {v.symptoms.length ? v.symptoms.join(', ') : 'None'}
                            </p>
                            <p>
                              <span className="text-slate-500">Notes:</span> {v.notes}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
