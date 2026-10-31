'use client';

import React, { useState } from 'react';
import { AuthUser } from '@/types';
import { sendPhoneOtp, verifyPhoneOtp } from '@/lib/api';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
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
      const res = await sendPhoneOtp(cleanPhone);
      setOtpSent(true);
      setOtpHint(res.demo_otp_hint);
      setOtp(res.demo_otp_hint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const user = await verifyPhoneOtp({
        phone: phone.trim(),
        otp: otp.trim(),
        name: mode === 'signup' ? name.trim() : undefined,
        age: mode === 'signup' && age ? Number(age) : undefined,
        gestational_week:
          mode === 'signup' && gestationalWeek ? Number(gestationalWeek) : undefined,
      });
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-700 text-white font-bold text-xl mb-3">
            M
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MatruRaksha AI</h1>
          <p className="text-sm text-slate-500 mt-1">
            Personal Maternal Health & Risk Companion
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-6">
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
                    placeholder="Enter your full name"
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
                      placeholder="Optional (1–42)"
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
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
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
            {otpHint && (
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-800">
                Verification OTP sent to <strong>{phone}</strong>. Code:{' '}
                <span className="font-mono font-bold underline">{otpHint}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                6-Digit OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-full px-3.5 py-2.5 text-sm font-mono tracking-widest rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
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
              }}
              className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
