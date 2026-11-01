'use client';

import React, { useState } from 'react';
import { MockVisit } from '@/data/supervisorMockData';

interface Series {
  label: string;
  color: string;
  values: (v: MockVisit) => number;
}

interface Metric {
  id: string;
  tab: string;
  unit: string;
  min: number;
  max: number;
  series: Series[];
  threshold?: { value: number; label: string };
}

const METRICS: Metric[] = [
  {
    id: 'bp',
    tab: 'Blood pressure',
    unit: 'mmHg',
    min: 60,
    max: 170,
    series: [
      { label: 'Systolic', color: '#b91c1c', values: (v) => v.systolic },
      { label: 'Diastolic', color: '#0f766e', values: (v) => v.diastolic },
    ],
    threshold: { value: 140, label: '140 high' },
  },
  {
    id: 'sugar',
    tab: 'Blood sugar',
    unit: 'mmol/L',
    min: 4,
    max: 10,
    series: [{ label: 'Blood sugar', color: '#b45309', values: (v) => v.sugar }],
    threshold: { value: 7.8, label: '7.8 high' },
  },
  {
    id: 'hb',
    tab: 'Hemoglobin',
    unit: 'g/dL',
    min: 8,
    max: 13,
    series: [{ label: 'Hemoglobin', color: '#0f766e', values: (v) => v.hemoglobin }],
    threshold: { value: 11, label: '11 low' },
  },
  {
    id: 'weight',
    tab: 'Weight',
    unit: 'kg',
    min: 50,
    max: 66,
    series: [{ label: 'Weight', color: '#0f766e', values: (v) => v.weight }],
  },
  {
    id: 'fhr',
    tab: 'Fetal heart rate',
    unit: 'bpm',
    min: 100,
    max: 180,
    series: [{ label: 'Fetal heart rate', color: '#0f766e', values: (v) => v.fetalHr }],
  },
];

const W = 760;
const H = 280;
const PAD = { top: 16, right: 20, bottom: 36, left: 44 };

export default function SupervisorCharts({ visits }: { visits: MockVisit[] }) {
  const [metricId, setMetricId] = useState('bp');
  const [hover, setHover] = useState<number | null>(null);
  const metric = METRICS.find((m) => m.id === metricId)!;

  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (visits.length - 1)) * cw;
  const y = (val: number) =>
    PAD.top + ch - ((Math.min(metric.max, Math.max(metric.min, val)) - metric.min) / (metric.max - metric.min)) * ch;

  const ticks = Array.from({ length: 5 }, (_, i) => metric.min + ((metric.max - metric.min) * i) / 4);
  const active = hover ?? visits.length - 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-bold text-slate-900">Trends</h2>
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetricId(m.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                m.id === metricId ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {m.tab}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}

        {metric.threshold && (
          <g>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(metric.threshold.value)}
              y2={y(metric.threshold.value)}
              stroke="#b91c1c"
              strokeDasharray="4 4"
            />
            <text
              x={W - PAD.right}
              y={y(metric.threshold.value) - 5}
              textAnchor="end"
              fontSize="11"
              fill="#b91c1c"
            >
              {metric.threshold.label}
            </text>
          </g>
        )}

        {metric.series.map((s) => (
          <g key={s.label}>
            <path
              d={visits.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(s.values(v))}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {visits.map((v, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(s.values(v))}
                r={i === active ? 5 : 3.5}
                fill={s.color}
                stroke="#fff"
                strokeWidth="2"
              />
            ))}
          </g>
        ))}

        {visits.map((v, i) => (
          <g key={v.week}>
            <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="#64748b">
              Wk {v.week}
            </text>
            <rect
              x={x(i) - 22}
              y={PAD.top}
              width={44}
              height={ch}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-4">
          {metric.series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <p className="text-slate-600">
          Week {visits[active].week}:{' '}
          <span className="font-semibold text-slate-900">
            {metric.series.map((s) => s.values(visits[active])).join(' / ')} {metric.unit}
          </span>
        </p>
      </div>
    </div>
  );
}
