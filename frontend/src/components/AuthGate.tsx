'use client';

import React, { useRef, useState } from 'react';
import { ConfirmationResult } from 'firebase/auth';
import { AuthUser } from '@/types';
import { sendPhoneOtp, verifyPhoneOtp } from '@/lib/api';
import { formatE164Phone, triggerFirebasePhoneOtp } from '@/lib/firebase';

interface AuthGateProps {
  onAuthenticated: (user: AuthUser) => void;
}

export default function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gestationalWeek, setGestationalWeek] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [firebaseSmsSent, setFirebaseSmsSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const handleFillDemo = () => {
    setError('');
    setPhone('9876543210');
    if (mode === 'signup') {
      setName('Sunita Sharma');
      setAge('26');
      setGestationalWeek('24');
    }
    if (otpSent) {
      setOtp('123456');
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const rawDigits = phone.replace(/\D/g, '');
    const cleanPhone = rawDigits.length === 10 ? rawDigits : rawDigits.slice(-10);

    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      const ageNum = Number(age);
      if (!age || isNaN(ageNum) || ageNum < 10 || ageNum > 70) {
        setError('Please enter your age (10–70 years).');
        return;
      }
    }

    setLoading(true);
    try {
      const e164 = `+91${cleanPhone}`;
      // Request backend OTP and attempt Firebase Phone SMS in parallel
      const [backendRes, fbConfirmation] = await Promise.all([
        sendPhoneOtp(e164),
        triggerFirebasePhoneOtp(e164, 'recaptcha-container'),
      ]);

      confirmationRef.current = fbConfirmation;
      const fallbackCode = backendRes.demo_otp_hint || '123456';
      setOtpHint(fallbackCode);
      setOtpSent(true);

      if (fbConfirmation) {
        setFirebaseSmsSent(true);
        // Pre-fill fallback if it's the demo number
        if (cleanPhone === '9876543210') {
          setOtp('123456');
        } else {
          setOtp('');
        }
      } else {
        setFirebaseSmsSent(false);
        setOtp(fallbackCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const enteredOtp = otp.trim();
    if (!enteredOtp) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      let firebaseIdToken: string | undefined;

      // Verify real Firebase SMS code if available and user entered non-fallback OTP
      if (confirmationRef.current && enteredOtp !== '123456') {
        try {
          const credential = await confirmationRef.current.confirm(enteredOtp);
          if (credential?.user?.getIdToken) {
            firebaseIdToken = await credential.user.getIdToken();
          }
        } catch (fbErr) {
          console.warn('Firebase confirmation failed, trying backend verification:', fbErr);
        }
      } else if (confirmationRef.current && enteredOtp === '123456') {
        // Attempt confirmation in case 123456 is set as test code in Firebase Console
        try {
          const credential = await confirmationRef.current.confirm(enteredOtp);
          if (credential?.user?.getIdToken) {
            firebaseIdToken = await credential.user.getIdToken();
          }
        } catch {
          // Fall back gracefully to backend verification
        }
      }

      const rawDigits = phone.replace(/\D/g, '');
      const cleanPhone = `+91${rawDigits.slice(-10)}`;

      const user = await verifyPhoneOtp({
        phone: cleanPhone,
        otp: enteredOtp,
        name: mode === 'signup' ? name.trim() : undefined,
        age: mode === 'signup' && age ? Number(age) : undefined,
        gestational_week:
          mode === 'signup' && gestationalWeek ? Number(gestationalWeek) : undefined,
        firebase_id_token: firebaseIdToken,
      });
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8">
      <div id="recaptcha-container" />
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs p-1.5 mb-3">
            <img
              src="/logo.png"
              alt="MatruRaksha Logo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MatruRaksha AI</h1>
          <p className="text-sm text-slate-500 mt-1">
            Personal Maternal Health & Risk Companion
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setOtpSent(false);
              setError('');
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setOtpSent(false);
              setError('');
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Compact Demo Credentials Auto-Fill */}
        <div className="mb-4 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500">Demo:</span>
            <span className="font-mono font-medium text-slate-900 whitespace-nowrap">+91 9876543210</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">OTP:</span>
            <span className="font-mono font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-300">
              123456
            </span>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg text-[11px] transition cursor-pointer shrink-0"
          >
            Auto-Fill
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sunita Sharma"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Your Age (Years) *
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={70}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 26"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Pregnancy Week
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={42}
                      value={gestationalWeek}
                      onChange={(e) => setGestationalWeek(e.target.value)}
                      placeholder="e.g. 24 (1–42)"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Mobile Number *
              </label>
              <div className="flex items-center rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-teal-600 focus-within:border-transparent overflow-hidden bg-white shadow-2xs">
                <span className="inline-flex items-center px-3.5 py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm border-r border-slate-300 select-none whitespace-nowrap shrink-0">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold text-sm transition cursor-pointer"
            >
              {loading ? 'Sending OTP...' : 'Continue with OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-700 whitespace-nowrap">
                OTP sent to <strong className="font-mono">+91 {phone}</strong>
              </span>
              <button
                type="button"
                onClick={() => setOtp('123456')}
                className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg text-[11px] transition cursor-pointer shrink-0 ml-2"
              >
                Use 123456
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                6-Digit Verification OTP *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 text-sm font-mono tracking-widest text-center rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold text-sm transition cursor-pointer"
            >
              {loading ? 'Verifying...' : mode === 'signup' ? 'Complete Sign Up' : 'Verify & Log In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp('');
                setFirebaseSmsSent(false);
                confirmationRef.current = null;
              }}
              className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Back to Mobile Number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
