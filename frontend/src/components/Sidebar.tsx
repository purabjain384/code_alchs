'use client';

import React from 'react';
import { AuthUser, NavTab } from '@/types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: AuthUser;
  onLogout: () => void;
  visitsCount: number;
}

export default function Sidebar({
  activeTab,
  onSelectTab,
  user,
  onLogout,
  visitsCount,
}: SidebarProps) {
  const navItems: Array<{ id: NavTab; label: string; badge?: number }> = [
    { id: 'dashboard', label: 'My Dashboard' },
    { id: 'new-form', label: 'New Checkup Form' },
    { id: 'history', label: 'My Checkup History', badge: visitsCount },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        <div className="p-6 border-b border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-base">
            M
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">MatruRaksha</h2>
            <p className="text-xs text-slate-500">Maternal Health Companion</p>
          </div>
        </div>

        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{item.label}</span>
                {typeof item.badge === 'number' && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="mb-3">
          <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Age {user.age} yrs
            {user.gestational_week ? ` • Week ${user.gestational_week}` : ''}
          </p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{user.phone}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}
