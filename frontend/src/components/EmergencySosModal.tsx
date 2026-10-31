'use client';

import React, { useState } from 'react';
import { MotherRecord } from '@/types';
import { MOCK_MOTHERS } from '@/data/mockData';

interface EmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMother?: MotherRecord | null;
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  isOpen,
  onClose,
  initialMother,
}) => {
  const [selectedMotherId, setSelectedMotherId] = useState(
    initialMother ? initialMother.id : 'MR-1024'
  );
  const [emergencyReason, setEmergencyReason] = useState('Severe Pre-eclampsia (BP > 140/90)');
  const [targetFacility, setTargetFacility] = useState('Raigad District Civil Hospital (FRU)');
  const [isDispatched, setIsDispatched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentMother =
    MOCK_MOTHERS.find((m) => m.id === selectedMotherId) || MOCK_MOTHERS[0];

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsDispatched(true);
    }, 800);
  };

  const handleReset = () => {
    setIsDispatched(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-error/30 overflow-hidden">
        {/* Top Header */}
        <div className="bg-error px-6 py-4 text-on-error flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[28px] animate-bounce">
              emergency
            </span>
            <div>
              <h3 className="font-bold text-base leading-tight">
                108 Emergency Ambulance Referral
              </h3>
              <p className="text-[11px] text-on-error/80">
                National Health Mission • Critical Escalation Node
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-on-error/80 hover:text-white hover:bg-black/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isDispatched ? (
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-secondary-container text-secondary flex items-center justify-center mx-auto shadow-md">
                <span className="material-symbols-outlined text-[36px]">
                  check_circle
                </span>
              </div>
              <div>
                <h4 className="text-xl font-extrabold text-primary-container">
                  108 Ambulance Unit Dispatched!
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Alert broadcasted to Central Ambulance Control & On-Duty Ob-Gyn Team.
                </p>
              </div>

              {/* Live Tracking Card */}
              <div className="p-4 rounded-xl bg-surface-container-low text-left text-xs space-y-2 border border-outline-variant/30">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-semibold">Vehicle No:</span>
                  <strong className="text-on-surface">MH-06-AZ-1108 (ALS Unit)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-semibold">Paramedic / Pilot:</span>
                  <strong className="text-on-surface">Ramesh Patil (+91 98210-99887)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-semibold">Estimated Arrival (ETA):</span>
                  <span className="font-bold text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">schedule</span>
                    14 Minutes • En Route
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-outline-variant/20 pt-2">
                  <span className="text-on-surface-variant font-semibold">Destination FRU:</span>
                  <strong className="text-primary-container">{targetFacility}</strong>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-bold hover:bg-primary-container/90 transition-all shadow-md"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDispatch} className="space-y-4">
              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Select High-Risk Expectant Mother / मरीज चुनें
                </label>
                <select
                  value={selectedMotherId}
                  onChange={(e) => setSelectedMotherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-semibold focus:outline-none focus:border-error"
                >
                  {MOCK_MOTHERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id}) • {m.village} • Week {m.gestationalWeek} • {m.riskLevel}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Vitals Snapshot */}
              <div className="p-3 rounded-xl bg-error-container/30 border border-error-container text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-error">Current Blood Pressure:</span>
                  <span className="font-extrabold text-on-surface ml-1">
                    {currentMother.bloodPressure}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-error">Hb:</span>
                  <span className="font-extrabold text-on-surface ml-1">
                    {currentMother.hemoglobin} g/dL
                  </span>
                </div>
                <div>
                  <span className="font-bold text-error">FHR:</span>
                  <span className="font-extrabold text-on-surface ml-1">
                    {currentMother.fetalHeartRate} bpm
                  </span>
                </div>
              </div>

              {/* Emergency Reason */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Clinical Emergency Indication / आपातकालीन कारण
                </label>
                <select
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-medium focus:outline-none focus:border-error"
                >
                  <option value="Severe Pre-eclampsia (BP > 140/90)">
                    Severe Pre-eclampsia (BP &gt; 140/90, Headache/Blurry Vision)
                  </option>
                  <option value="Severe Anemia Crisis (Hb < 7 g/dL)">
                    Severe Anemia Crisis (Hb &lt; 7 g/dL, Extreme Pallor)
                  </option>
                  <option value="Antepartum Hemorrhage / Bleeding">
                    Antepartum Hemorrhage / Active Bleeding
                  </option>
                  <option value="Pre-term Obstructed Labor">
                    Pre-term / Obstructed Labor
                  </option>
                  <option value="Fetal Distress / Abnormal Heart Rate">
                    Fetal Distress / FHR &lt; 110 or &gt; 160 bpm
                  </option>
                </select>
              </div>

              {/* Destination Facility */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Referral Facility (FRU Center) / रेफरल अस्पताल
                </label>
                <select
                  value={targetFacility}
                  onChange={(e) => setTargetFacility(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-medium focus:outline-none focus:border-error"
                >
                  <option value="Raigad District Civil Hospital (FRU)">
                    Raigad District Civil Hospital (FRU - Blood Bank & C-Section Available)
                  </option>
                  <option value="Udaipur Rural Primary Health Center">
                    Udaipur Rural PHC (Triage & Stabilization)
                  </option>
                  <option value="Sub-District Hospital Alibag">
                    Sub-District Hospital Alibag
                  </option>
                </select>
              </div>

              {/* Location GPS */}
              <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-low p-2 rounded-lg">
                <span className="material-symbols-outlined text-[18px] text-error">
                  my_location
                </span>
                <span>
                  Auto-GPS Pin: <strong>{currentMother.ward}, {currentMother.village}</strong> (Lat 18.9812° N)
                </span>
              </div>

              {/* Actions */}
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
                  className="flex-1 py-2.5 rounded-xl bg-error hover:bg-error/90 text-on-error text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    e911_emergency
                  </span>
                  <span>{isSubmitting ? 'Dispatching...' : 'Confirm SOS Dispatch'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

