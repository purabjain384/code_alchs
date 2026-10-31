'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { sendPhoneOtp, verifyPhoneOtp } from '@/lib/api';
import { isFirebaseClientConfigured, triggerFirebasePhoneOtp } from '@/lib/firebase';
import { UserRole } from '@/types';
import type { ConfirmationResult } from 'firebase/auth';

export const PhoneAuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, setCurrentUser, mothers } = useApp();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+91 ');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('asha');
  const [village, setVillage] = useState('Rampura');
  const [ward, setWard] = useState('Ward 1');
  const [selectedMotherId, setSelectedMotherId] = useState('');
  const [otp, setOtp] = useState('');
  const [demoHint, setDemoHint] = useState('');
  const [fbConfirmation, setFbConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthModalOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\s+/g, '');
      if (isFirebaseClientConfigured()) {
        try {
          const conf = await triggerFirebasePhoneOtp(cleanPhone, 'recaptcha-container');
          setFbConfirmation(conf);
        } catch (fbErr) {
          console.warn('Firebase client SMS fallback to backend OTP:', fbErr);
        }
      }
      const res = await sendPhoneOtp(cleanPhone);
      setDemoHint(res.demo_otp_hint);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let firebaseIdToken: string | undefined;
      if (fbConfirmation) {
        try {
          const cred = await fbConfirmation.confirm(otp);
          firebaseIdToken = await cred.user.getIdToken();
        } catch {
          // fallback to backend OTP check
        }
      }

      const cleanPhone = phone.replace(/\s+/g, '');
      const user = await verifyPhoneOtp({
        phone: cleanPhone,
        otp,
        firebase_id_token: firebaseIdToken,
        name: name.trim() || undefined,
        role,
        village,
        ward,
        mother_id: role === 'mother' ? selectedMotherId || undefined : undefined,
      });

      setCurrentUser(user);
      setStep('phone');
      setOtp('');
      setIsAuthModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden">
        <div className="bg-primary-container px-6 py-4 text-on-primary flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[24px] text-secondary-fixed">
              verified_user
            </span>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Phone + OTP Sign Up / Login
              </h3>
              <p className="text-[11px] text-primary-fixed/80">
                Firebase Phone Authentication • MatruRaksha OS
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1 rounded-full text-primary-fixed hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div id="recaptcha-container" />

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-xs font-bold">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Select Role / अपनी भूमिका चुनें *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['supervisor', 'asha', 'mother'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border capitalize transition-all ${
                        role === r
                          ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                          : 'bg-surface-container-low text-on-surface border-outline-variant/40'
                      }`}
                    >
                      {r === 'supervisor' ? 'Doctor / MO' : r === 'asha' ? 'ASHA Worker' : 'Mother'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Mobile Number (with +91) / मोबाइल नंबर *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Full Name / पूरा नाम (for new signups)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    role === 'supervisor'
                      ? 'Dr. Priya Sharma'
                      : role === 'asha'
                      ? 'Sunita Ji'
                      : 'Sunita Devi'
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-medium text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              {role === 'mother' && mothers.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Link to Registered Mother ID (Optional)
                  </label>
                  <select
                    value={selectedMotherId}
                    onChange={(e) => setSelectedMotherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-semibold text-on-surface"
                  >
                    <option value="">Auto-match by Phone Number</option>
                    {mothers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id}) - {m.village}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Village / गाँव
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Ward / वार्ड
                  </label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold shadow-md hover:bg-secondary/90 transition-all"
              >
                {loading ? 'Sending OTP...' : 'Send 6-Digit OTP →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 rounded-xl bg-secondary-container/30 border border-secondary-container text-xs text-on-surface">
                OTP sent to <strong>{phone}</strong>.
                {demoHint && (
                  <span className="block mt-1 text-secondary font-bold">
                    Verification OTP Code: {demoHint}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Enter 6-Digit OTP / ओटीपी दर्ज करें *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-center tracking-widest text-lg font-extrabold text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold"
                >
                  ← Change Phone
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold shadow-md"
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

