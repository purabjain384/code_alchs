'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { MATRURAKSHA_LOGO_URL, DOCTOR_PROFILE_URL, DEFAULT_ASHA_AVATAR_URL } from '@/data/mockData';
import { UserRole } from '@/types';
import { useApp } from '@/context/AppContext';
import { PhoneAuthModal } from './PhoneAuthModal';

interface HeaderProps {
  currentRole: UserRole;
  onToggleSidebar?: () => void;
  onOpenSosModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onToggleSidebar,
  onOpenSosModal,
}) => {
  const pathname = usePathname();
  const { currentUser, setIsAuthModalOpen, logout, mothers } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  const activeRole: UserRole =
    pathname.includes('/asha')
      ? 'asha'
      : pathname.includes('/mother')
      ? 'mother'
      : currentRole || 'supervisor';

  const highRiskAlerts = mothers.filter((m) => m.riskLevel === 'HIGH' || m.isOverdue);

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-16 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(33,19,63,0.04)] px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              aria-label="Toggle Navigation"
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors lg:hidden"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
          )}

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-8 w-28 sm:w-36 flex items-center">
              <Image
                src={MATRURAKSHA_LOGO_URL}
                alt="MatruRaksha Logo"
                width={140}
                height={32}
                className="h-7 w-auto object-contain"
                priority
              />
            </div>
          </Link>

          <div className="h-5 w-px bg-outline-variant/40 hidden md:block" />

          <div className="hidden xl:flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
            <span>National Health Mission</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-secondary font-bold">Live PHC Surveillance</span>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center bg-surface-container-low p-1 rounded-full border border-outline-variant/40 shadow-inner">
          <Link
            href="/"
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              activeRole === 'supervisor'
                ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Supervisor
          </Link>
          <Link
            href="/asha"
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              activeRole === 'asha'
                ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            ASHA (Field)
          </Link>
          <Link
            href="/mother"
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              activeRole === 'mother'
                ? 'bg-tertiary-fixed text-primary-container font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Mother (Companion)
          </Link>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenSosModal && (
            <button
              onClick={onOpenSosModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error text-on-error text-xs font-bold shadow-sm hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">e911_emergency</span>
              <span>SOS 108</span>
            </button>
          )}

          {/* Live Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
              className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {highRiskAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface-container-lowest animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <span className="font-bold text-xs uppercase tracking-wider text-primary-container">
                    Live Alerts ({highRiskAlerts.length})
                  </span>
                </div>
                <div className="divide-y divide-outline-variant/10 text-xs max-h-60 overflow-y-auto">
                  {highRiskAlerts.length === 0 ? (
                    <p className="py-4 text-center text-on-surface-variant">
                      No active high-risk alerts right now.
                    </p>
                  ) : (
                    highRiskAlerts.map((m) => (
                      <div key={m.id} className="py-2.5">
                        <p className="font-bold text-error flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-error" />
                          {m.name} ({m.id}) • {m.riskLevel}
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          BP {m.bloodPressure} • Hb {m.hemoglobin} g/dL • {m.village}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-outline-variant/40 hidden sm:block" />

          {/* Phone Auth User / Login Button */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden md:flex flex-col">
                <span className="text-xs font-bold text-on-surface leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-secondary font-semibold">
                  {currentUser.phone} • {currentUser.role.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Logout"
                className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface hover:bg-error-container hover:text-on-error-container text-[11px] font-bold transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-container text-on-primary text-xs font-bold shadow-xs hover:opacity-95"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Phone OTP Login</span>
            </button>
          )}

          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-secondary/50 hidden sm:block">
            <Image
              src={activeRole === 'supervisor' ? DOCTOR_PROFILE_URL : DEFAULT_ASHA_AVATAR_URL}
              alt="Profile"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </header>
      <PhoneAuthModal />
    </>
  );
};
