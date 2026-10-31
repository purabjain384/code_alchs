'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenSosModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  activeTab = 'overview',
  onTabChange,
  onOpenSosModal,
}) => {
  const pathname = usePathname();
  const { mothers, setIsAuthModalOpen } = useApp();

  const highRiskCount = mothers.filter((m) => m.riskLevel === 'HIGH').length;

  const handleNavClick = (tabKey: string) => {
    if (onTabChange) onTabChange(tabKey);
    if (onClose) onClose();
  };

  const navItems = [
    { key: 'overview', label: 'Overview', icon: 'grid_view', href: '/' },
    {
      key: 'mothers-registry',
      label: 'Mothers Registry',
      icon: 'pregnant_woman',
      badge: mothers.length > 0 ? String(mothers.length) : undefined,
      badgeColor: 'bg-secondary',
      href: '/#roster',
    },
    { key: 'asha-workers', label: 'ASHA Field View', icon: 'diversity_1', href: '/asha' },
    {
      key: 'high-risk',
      label: 'High-Risk Cases',
      icon: 'emergency',
      badge: highRiskCount > 0 ? String(highRiskCount) : undefined,
      badgeColor: 'bg-error',
      href: '/#high-risk',
    },
    { key: 'companion-view', label: 'Mother Companion', icon: 'favorite', href: '/mother' },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-primary/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-primary-container text-on-primary z-50 flex flex-col shadow-[0_4px_24px_rgba(33,19,63,0.18)] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-6 flex items-center justify-between border-b border-on-primary-container/20">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-secondary-fixed ring-2 ring-secondary animate-pulse" />
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-on-primary">
                MatruRaksha
              </span>
              <span className="text-[10px] text-secondary-fixed-dim uppercase tracking-wider font-semibold">
                Maternal Care OS
              </span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-primary-fixed hover:text-white lg:hidden"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        <div className="px-4 py-2 border-b border-on-primary-container/15 bg-on-primary-fixed/20">
          <div className="flex items-center justify-between text-on-primary-container text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary-container" />
              PHC Raigad District
            </span>
            <span className="text-tertiary-fixed font-bold text-[11px]">Live 24x7</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-on-primary-container/80">
              Clinical Surveillance
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  activeTab === item.key ||
                  (item.key === 'overview' && pathname === '/' && !activeTab) ||
                  (item.key === 'asha-workers' && pathname.includes('/asha')) ||
                  (item.key === 'companion-view' && pathname.includes('/mother'));

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => handleNavClick(item.key)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all text-sm font-semibold ${
                      isActive
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed font-bold shadow-sm'
                        : 'text-primary-fixed hover:bg-on-primary-fixed-variant/40 hover:text-on-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px]">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] text-white font-bold ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="pt-2 mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-on-primary-container/80">
              Authentication
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-primary-fixed hover:bg-on-primary-fixed-variant/40 hover:text-on-primary transition-all text-sm font-semibold text-left"
            >
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
              <span>Phone + OTP Sign In</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-on-primary-container/20 bg-on-primary-fixed/30">
          <button
            type="button"
            onClick={onOpenSosModal}
            className="w-full p-3 rounded-xl bg-primary-container/80 border border-on-primary-container/40 flex items-center justify-between hover:bg-primary-container hover:border-tertiary-fixed transition-all text-left group"
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-secondary-fixed uppercase tracking-wider">
                Emergency Referral
              </span>
              <span className="text-xs font-extrabold text-on-primary group-hover:text-tertiary-fixed transition-colors">
                108 / 102 Ambulance
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-secondary-fixed/20 flex items-center justify-center text-secondary-fixed">
              <span className="material-symbols-outlined text-[20px]">e911_emergency</span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};
