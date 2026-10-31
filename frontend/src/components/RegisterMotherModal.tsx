'use client';

import React, { useState } from 'react';
import { MotherRecord, RiskLevel } from '@/types';

interface RegisterMotherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newMother: MotherRecord) => void;
}

export const RegisterMotherModal: React.FC<RegisterMotherModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [age, setAge] = useState('24');
  const [village, setVillage] = useState('Rampura');
  const [ward, setWard] = useState('Ward 2');
  const [gestationalWeek, setGestationalWeek] = useState('16');
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [hemoglobin, setHemoglobin] = useState('11.0');
  const [isPreEclampsia, setIsPreEclampsia] = useState(false);
  const [isSevereAnemia, setIsSevereAnemia] = useState(false);
  const [isGdm, setIsGdm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let calculatedRisk: RiskLevel = 'LOW';
    const flags: string[] = [];

    const sys = parseInt(systolic) || 120;
    const dia = parseInt(diastolic) || 80;
    const hb = parseFloat(hemoglobin) || 11.0;

    if (sys >= 140 || dia >= 90 || isPreEclampsia) {
      calculatedRisk = 'HIGH';
      flags.push(`BP ${sys}/${dia} mmHg`, 'Pre-eclampsia');
    }

    if (hb < 9.0 || isSevereAnemia) {
      if (hb < 8.0) calculatedRisk = 'HIGH';
      else if (calculatedRisk !== 'HIGH') calculatedRisk = 'MODERATE';
      flags.push(`Hb ${hb} g/dL`);
    }

    if (isGdm) {
      if (calculatedRisk !== 'HIGH') calculatedRisk = 'HIGH';
      flags.push('GDM');
    }

    if (flags.length === 0) {
      flags.push('Stable Vitals', 'Routine Checkup');
    }

    const newRecord: MotherRecord = {
      id: `MR-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name.trim() || 'New Expectant Mother',
      hindiName: hindiName.trim() || undefined,
      age: parseInt(age) || 24,
      gravidaPara: 'G1P0',
      village,
      ward,
      phcSector: `${village} Sub-Center`,
      gestationalWeek: parseInt(gestationalWeek) || 16,
      trimester: parseInt(gestationalWeek) > 26 ? 3 : parseInt(gestationalWeek) > 12 ? 2 : 1,
      edd: '25 May 2027',
      riskLevel: calculatedRisk,
      riskReason: flags.join(' • '),
      bloodPressure: `${sys}/${dia} mmHg`,
      hemoglobin: hb,
      weight: 56.0,
      weightGain: '+4.0 kg',
      fetalHeartRate: 140,
      flags,
      lastVisitDate: 'Today (Intake)',
      nextDueDate: '14 Nov 2026',
      assignedAsha: {
        name: 'ASHA Sunita B.',
        phone: '+91 98290-12345',
        id: 'ASHA-704',
      },
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAnFK4NanMo0ojsO2csTKrKYc5THUQVNAq76h66Dln9zHb7EjHNaqPOMRabZQInj_fwldPsHtBSDodJET09nTgfBJacb4Xo0NC7bY77O_IHeUmW28jimI-MC9eJqd4FMdaUbkUQNFU0ZNBcQ-1lEOR8ZexhkTCUtyd_xTWiXOotEqvw5wdQqu96BJLKVmo9RvswLziP3fvqIteGECZsbzXzl-uJRobCd2Cu4DHOMQDu',
    };

    setIsSuccess(true);
    setTimeout(() => {
      onSave(newRecord);
      setIsSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden">
        {/* Header */}
        <div className="bg-primary-container px-6 py-4 text-on-primary flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">person_add</span>
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Register New Mother / नया पंजीकरण
              </h3>
              <p className="text-[11px] text-primary-fixed-dim">
                Frontline NHM RCH Intake • Immediate Risk Triage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-primary-fixed hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-6 space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-secondary-container text-secondary flex items-center justify-center mx-auto shadow-sm">
                <span className="material-symbols-outlined text-[32px]">check_circle</span>
              </div>
              <h4 className="text-lg font-bold text-primary-container">
                Mother Successfully Registered!
              </h4>
              <p className="text-xs text-on-surface-variant">
                Enrolled in surveillance cohort with assigned ASHA field contact.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface mb-1">
                    Mother's Full Name (English) *
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Radhika Sharma"
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface font-semibold focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface mb-1">
                    नाम (हिंदी) / Optional
                  </label>
                  <input
                    type="text"
                    value={hindiName}
                    onChange={(e) => setHindiName(e.target.value)}
                    placeholder="उदा. राधिका शर्मा"
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface font-medium focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              {/* Age, Village, Ward */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-on-surface mb-1">Age (वर्ष)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface font-semibold focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface mb-1">Village / गाँव</label>
                  <select
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface font-semibold focus:outline-none focus:border-secondary"
                  >
                    <option value="Rampura">Rampura</option>
                    <option value="Girwa">Girwa</option>
                    <option value="Savina">Savina</option>
                    <option value="Badgaon">Badgaon</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-on-surface mb-1">Ward / ढाणी</label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface font-medium focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              {/* Gestational Age & Vitals */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3">
                <span className="font-bold text-primary-container block">
                  Clinical Intake & Baseline Vitals
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-on-surface-variant mb-1">
                      Weeks (सप्ताह)
                    </label>
                    <input
                      type="number"
                      min="4"
                      max="42"
                      value={gestationalWeek}
                      onChange={(e) => setGestationalWeek(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-bold text-primary-container"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-on-surface-variant mb-1">
                      BP (Systolic)
                    </label>
                    <input
                      type="number"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-on-surface-variant mb-1">
                      BP (Diastolic)
                    </label>
                    <input
                      type="number"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-on-surface-variant mb-1">
                    Hemoglobin (Hb g/dL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={hemoglobin}
                    onChange={(e) => setHemoglobin(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-bold"
                  />
                </div>
              </div>

              {/* Risk Flags Screening Checkboxes */}
              <div>
                <label className="block font-bold text-on-surface mb-1.5">
                  Pre-existing Risk Indicators / जोखिम लक्षण
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container">
                    <input
                      type="checkbox"
                      checked={isPreEclampsia}
                      onChange={(e) => setIsPreEclampsia(e.target.checked)}
                      className="rounded accent-error w-4 h-4"
                    />
                    <span className="font-semibold text-error">Pre-eclampsia (High BP)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container">
                    <input
                      type="checkbox"
                      checked={isSevereAnemia}
                      onChange={(e) => setIsSevereAnemia(e.target.checked)}
                      className="rounded accent-error w-4 h-4"
                    />
                    <span className="font-semibold text-tertiary">Severe Anemia (&lt; 9)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container">
                    <input
                      type="checkbox"
                      checked={isGdm}
                      onChange={(e) => setIsGdm(e.target.checked)}
                      className="rounded accent-error w-4 h-4"
                    />
                    <span className="font-semibold text-error">Diabetes (GDM)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-on-secondary font-bold hover:bg-secondary/90 transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>Complete Registration</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

