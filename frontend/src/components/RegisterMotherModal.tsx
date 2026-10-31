'use client';

import React, { useState } from 'react';
import { MotherRecord } from '@/types';
import { useApp } from '@/context/AppContext';

interface RegisterMotherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister?: (newMother: MotherRecord) => void;
}

export const RegisterMotherModal: React.FC<RegisterMotherModalProps> = ({
  isOpen,
  onClose,
  onRegister,
}) => {
  const { registerMother } = useApp();

  const [name, setName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [age, setAge] = useState('24');
  const [phone, setPhone] = useState('+91 ');
  const [village, setVillage] = useState('Rampura');
  const [ward, setWard] = useState('Ward 1');
  const [gestationalWeek, setGestationalWeek] = useState('16');
  const [edd, setEdd] = useState('15 Mar 2027');
  const [systolic, setSystolic] = useState('118');
  const [diastolic, setDiastolic] = useState('78');
  const [hb, setHb] = useState('11.2');
  const [weight, setWeight] = useState('56.0');
  const [bloodSugar, setBloodSugar] = useState('5.2');
  const [bodyTemp, setBodyTemp] = useState('98.4');
  const [heartRate, setHeartRate] = useState('78');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      const created = await registerMother({
        name: name.trim(),
        hindiName: hindiName.trim(),
        age: parseInt(age, 10) || 24,
        phone: phone.trim(),
        village,
        ward,
        gestationalWeek: parseInt(gestationalWeek, 10) || 16,
        edd,
        bloodPressure: `${systolic}/${diastolic}`,
        hemoglobin: parseFloat(hb) || 11.2,
        weight: parseFloat(weight) || 56.0,
        fetalHeartRate: 142,
        bloodSugar: parseFloat(bloodSugar) || 5.2,
        bodyTemp: parseFloat(bodyTemp) || 98.4,
        heartRate: parseInt(heartRate, 10) || 78,
      });
      if (onRegister) onRegister(created);
      setName('');
      setHindiName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register mother');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-primary-container px-6 py-4 text-on-primary flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[26px] text-secondary-fixed">
              person_add
            </span>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Register Expectant Mother (RCH Portal Sync)
              </h3>
              <p className="text-[11px] text-primary-fixed/80">
                नयी गर्भवती महिला का पंजीकरण • Live Backend & ML Triage
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-bold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Full Name (English) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Geeta Verma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-medium text-on-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Name in Hindi / हिंदी नाम
              </label>
              <input
                type="text"
                placeholder="उदा. गीता वर्मा"
                value={hindiName}
                onChange={(e) => setHindiName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-medium text-on-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Age (Years) / उम्र *
              </label>
              <input
                type="number"
                min={14}
                max={55}
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Phone Number (for OTP Login)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-semibold text-on-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Village / गाँव *
              </label>
              <select
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-semibold text-on-surface"
              >
                <option value="Rampura">Rampura</option>
                <option value="Kishanpur">Kishanpur</option>
                <option value="Madhopur">Madhopur</option>
                <option value="Surajgarh">Surajgarh</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Ward / मोहल्ला *
              </label>
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-semibold text-on-surface"
              >
                <option value="Ward 1">Ward 1</option>
                <option value="Ward 2">Ward 2</option>
                <option value="Ward 3">Ward 3</option>
                <option value="Ward 4">Ward 4</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Gestational Age (Weeks) / गर्भावस्था सप्ताह *
              </label>
              <input
                type="number"
                min={4}
                max={42}
                required
                value={gestationalWeek}
                onChange={(e) => setGestationalWeek(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Expected Delivery Date (EDD)
              </label>
              <input
                type="text"
                value={edd}
                onChange={(e) => setEdd(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-medium text-on-surface"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">
              Baseline Clinical & ML Vitals (प्रारंभिक जांच)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Systolic BP
                </label>
                <input
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Diastolic BP
                </label>
                <input
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Hb (g/dL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={hb}
                  onChange={(e) => setHb(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Blood Sugar (mmol/L)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bloodSugar}
                  onChange={(e) => setBloodSugar(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Body Temp (°F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyTemp}
                  onChange={(e) => setBodyTemp(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-on-secondary text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              <span>{isSubmitting ? 'Registering...' : 'Complete Registration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
