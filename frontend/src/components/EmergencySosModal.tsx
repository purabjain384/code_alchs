'use client';

import React, { useState, useEffect } from 'react';
import { MotherRecord, SosDispatchRecord } from '@/types';
import { useApp } from '@/context/AppContext';
import { dispatchEmergencySos } from '@/lib/api';

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
  const { mothers, refreshData } = useApp();
  const [selectedMotherId, setSelectedMotherId] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('Severe Pre-eclampsia (BP > 140/90)');
  const [targetFacility, setTargetFacility] = useState('Raigad District Civil Hospital (FRU)');
  const [dispatchRecord, setDispatchRecord] = useState<SosDispatchRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const target = initialMother || mothers[0];
    if (target) setSelectedMotherId(target.id);
    setDispatchRecord(null);
  }, [initialMother, mothers, isOpen]);

  if (!isOpen) return null;

  const currentMother = mothers.find((m) => m.id === selectedMotherId) || initialMother || mothers[0];

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const record = await dispatchEmergencySos({
        mother_id: currentMother?.id || 'EMERGENCY-CALL',
        mother_name: currentMother?.name || 'Emergency Patient',
        village: currentMother?.village || 'Rampura',
        ward: currentMother?.ward || 'Ward 1',
        blood_pressure: currentMother?.bloodPressure || '150/95',
        emergency_reason: emergencyReason,
        target_facility: targetFacility,
      });
      setDispatchRecord(record);
      await refreshData();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-error/30 overflow-hidden">
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
                National Health Mission • Live FRU Escalation Node
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

        <div className="p-6">
          {dispatchRecord ? (
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-secondary-container text-secondary flex items-center justify-center mx-auto shadow-md">
                <span className="material-symbols-outlined text-[36px]">
                  check_circle
                </span>
              </div>
              <div>
                <h4 className="text-xl font-extrabold text-primary-container">
                  108 Ambulance Unit Dispatched! ({dispatchRecord.dispatch_id})
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Logged in Firestore & broadcasted to Central Ambulance Control.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low text-left text-xs space-y-2 border border-outline-variant/30">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-semibold">Patient:</span>
                  <strong className="text-on-surface">{dispatchRecord.mother_name} ({dispatchRecord.mother_id})</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-semibold">Vehicle No:</span>
                  <strong className="text-on-surface">{dispatchRecord.vehicle_no}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-semibold">Paramedic / Pilot:</span>
                  <strong className="text-on-surface">{dispatchRecord.pilot_name} ({dispatchRecord.pilot_phone})</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-semibold">Estimated Arrival (ETA):</span>
                  <span className="font-bold text-secondary">
                    {dispatchRecord.eta_minutes} Minutes • En Route
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-outline-variant/20 pt-2">
                  <span className="text-on-surface-variant font-semibold">Destination FRU:</span>
                  <strong className="text-primary-container">{dispatchRecord.target_facility}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-bold"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleDispatch} className="space-y-4">
              {mothers.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Select Expectant Mother / मरीज चुनें
                  </label>
                  <select
                    value={selectedMotherId}
                    onChange={(e) => setSelectedMotherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-semibold"
                  >
                    {mothers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id}) • {m.village} • Week {m.gestationalWeek} • {m.riskLevel}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentMother && (
                <div className="p-3 rounded-xl bg-error-container/30 border border-error-container text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-error">BP:</span>
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
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Clinical Emergency Indication / आपातकालीन कारण
                </label>
                <select
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-medium"
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
                  <option value="Fetal Distress / Abnormal Heart Rate">
                    Fetal Distress / FHR &lt; 110 or &gt; 160 bpm
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Referral Facility (FRU Center) / रेफरल अस्पताल
                </label>
                <select
                  value={targetFacility}
                  onChange={(e) => setTargetFacility(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-medium"
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

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-error text-on-error text-xs font-bold shadow-md flex items-center justify-center gap-2"
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
