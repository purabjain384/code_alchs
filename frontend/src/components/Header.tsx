'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { MATRURAKSHA_LOGO_URL, DOCTOR_PROFILE_URL, MOCK_ASHA_WORKER } from '@/data/mockData';
import { UserRole } from '@/types';

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
  const [showNotifications, setShowNotifications] = useState(false);

  // Derive active persona based on prop or pathname
  const activeRole: UserRole =
    pathname.includes('/asha')
      ? 'asha'
      : pathname.includes('/mother')
      ? 'mother'
      : currentRole || 'supervisor';

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(33,19,63,0.04)] px-4 lg:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger + Logo + Region Context */}
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
          <span className="hover:text-on-surface transition-colors">Maharashtra Health Mission</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-secondary font-bold">Raigad PHC Surveillance</span>
        </div>
      </div>

      {/* Middle: Role/Persona Switcher (Tabs) */}
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

      {/* Right: SOS Hotline, Notifications, Search & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenSosModal && (
          <button
            onClick={onOpenSosModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error text-on-error text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">e911_emergency</span>
            <span>SOS 108</span>
          </button>
        )}

        {/* Notifications Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface-container-lowest animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <span className="font-bold text-xs uppercase tracking-wider text-primary-container">
                  Surveillance Alerts (3)
                </span>
                <span className="text-[11px] text-secondary font-bold cursor-pointer hover:underline">
                  Mark read
                </span>
              </div>
              <div className="divide-y divide-outline-variant/10 text-xs">
                <div className="py-2.5">
                  <p className="font-bold text-error flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-error" />
                    Sunita Devi (MR-1024) BP Spike
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    BP 148/96 recorded by ASHA Sunita B. Escalation due.
                  </p>
                </div>
                <div className="py-2.5">
                  <p className="font-bold text-tertiary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                    Meena Kumari (MR-1031) IFA Visit Due
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Scheduled nutritional checkup window closes 5 PM.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-outline-variant/40 hidden sm:block" />

        {/* Dynamic Profile Persona Info */}
        <div className="flex items-center gap-2 pl-1">
          {activeRole === 'supervisor' ? (
            <>
              <div className="text-right hidden md:flex flex-col">
                <span className="text-xs font-bold text-on-surface leading-tight">
                  Dr. Priya Sharma
                </span>
                <span className="text-[10px] text-secondary font-semibold">Chief MO, Ob-Gyn</span>
              </div>
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-secondary/50">
                <Image
                  src={DOCTOR_PROFILE_URL}
                  alt="Dr. Priya Sharma"
                  fill
                  className="object-cover"
                />
              </div>
            </>
          ) : activeRole === 'asha' ? (
            <>
              <div className="text-right hidden md:flex flex-col">
                <span className="text-xs font-bold text-on-surface leading-tight">
                  Sunita Ji (ASHA-704)
                </span>
                <span className="text-[10px] text-secondary font-semibold">Rampura Ward 1 & 2</span>
              </div>
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-secondary/50">
                <Image
                  src={MOCK_ASHA_WORKER.avatarUrl}
                  alt="ASHA Sunita B."
                  fill
                  className="object-cover"
                />
              </div>
            </>
          ) : (
            <>
              <div className="text-right hidden md:flex flex-col">
                <span className="text-xs font-bold text-on-surface leading-tight">
                  Sunita Devi
                </span>
                <span className="text-[10px] text-secondary font-semibold">W28 • Rampura</span>
              </div>
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-tertiary-fixed">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-qZZP5-DvCb79lGhuvaOca3JNHD09ts7FPxBHpSrr0cMfzUl_nLn6tz9mp050qnlAXTKMiUH0WWWNeumuz64lTVuhmOIrBysaVCUP_R_Dvk9p2tkPVk9k28IN_bMU92KkJmtQjdgTYokB3oZmnX82PkIScFm6FoPgmFjiv2BR4gGN5tkbtpUXIZ-zBc2pLWrGHf-omtEC33NXfrwulXmnMbJRpN9OdupQS7bNjZjw"
                  alt="Sunita Devi"
                  fill
                  className="object-cover"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

