import React, { useState } from 'react';
import { ShieldCheck, Users, LogOut, Blocks, ArrowLeftRight, ChevronDown } from 'lucide-react';
import TermTooltip from './TermTooltip.jsx';

const ROLE_DISPLAY = {
  CIFV: {
    plainTitle: 'Donor Intake & Consent',
    term: 'CIFV'
  },
  SROPS: {
    plainTitle: 'Surgical Organ Recovery',
    term: 'SROPS'
  },
  ADMIN: {
    plainTitle: 'Audit & Certification',
    term: 'CTORB'
  },
  EXTERNAL: {
    plainTitle: 'Transplant Center',
    term: 'RTCN'
  }
};

const QUICK_SWITCH_DEPTS = [
  {
    id: 'DEPT_CIFV',
    role: 'CIFV',
    title: 'Donor Intake & Consent Wing',
    abbr: 'CIFV',
    icon: '🏥'
  },
  {
    id: 'DEPT_SROPS',
    role: 'SROPS',
    title: 'Surgical Organ Recovery Suite',
    abbr: 'SROPS',
    icon: '🫀'
  },
  {
    id: 'DEPT_ADMIN',
    role: 'ADMIN',
    title: 'Central Regulatory & Audit Board',
    abbr: 'CTORB',
    icon: '🏛️'
  }
];

export default function Navbar({
  currentDept,
  onLogout,
  onSwitchDepartment,
  onOpenDoctors,
  onOpenExplorer,
  blockHeight = 1
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const roleMeta = currentDept ? (ROLE_DISPLAY[currentDept.role] || {
    plainTitle: currentDept.badge || currentDept.name || 'Consortium Portal',
    term: currentDept.role || 'CIFV'
  }) : null;

  return (
    <header className="bg-gradient-to-r from-blue-900 via-sky-900 to-slate-900 text-white shadow-lg sticky top-0 z-40">
      {/* Top status strip */}
      <div className="bg-slate-950/90 px-4 py-1.5 text-xs border-b border-blue-800/40 flex flex-wrap justify-between items-center gap-2 text-slate-200">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            CONSORTIUM NETWORK ONLINE
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-slate-200">
            National Organ &amp; Tissue Transplant Registry • 2 Required Approvals out of 3 Specialists
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-amber-300 font-mono font-medium">
            24/7 Helpline: 1800-22-67426 (ORGAN)
          </span>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-md text-white font-bold text-xl ring-2 ring-white/20">
            🫀
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                MediChain
                <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 font-mono">
                  Consortium v2.6
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-200 font-normal hidden sm:block">
              Tamper-Proof Organ Donation &amp; Transplant Audit System
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Block Height Badge */}
          <button
            type="button"
            onClick={onOpenExplorer}
            className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer shadow-sm group"
            title="Open Audit Trail & Blockchain Ledger"
          >
            <Blocks className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <div className="text-left font-mono">
              <span className="text-slate-300 text-xs block leading-tight">AUDIT LEDGER</span>
              <span className="text-emerald-400 font-bold leading-tight">Block #{blockHeight}</span>
            </div>
          </button>

          {/* 9 Doctors Roster Button */}
          <button
            type="button"
            onClick={onOpenDoctors}
            className="flex items-center gap-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-blue-100 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">The 9 Specialists</span>
          </button>

          {/* Quick Role Switcher */}
          {onSwitchDepartment && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSwitcherOpen(prev => !prev)}
                aria-expanded={switcherOpen}
                aria-haspopup="true"
                className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-100 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-300" />
                <span className="hidden md:inline">Switch Role</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
              </button>

              {switcherOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-xs font-bold text-slate-600">
                    Switch Department Portal
                  </div>
                  {QUICK_SWITCH_DEPTS.map(dept => {
                    const isCurrent = currentDept && currentDept.role === dept.role;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => {
                          setSwitcherOpen(false);
                          onSwitchDepartment(dept);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer ${
                          isCurrent ? 'bg-blue-50/80 font-bold text-blue-900' : 'text-slate-700 font-medium'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{dept.icon}</span>
                          <span>{dept.title}</span>
                        </span>
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {dept.abbr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Logged in Department Badge or Login prompt */}
          {currentDept && roleMeta ? (
            <div className="flex items-center gap-2.5 border-l border-slate-700 pl-3">
              <div className="text-right hidden sm:flex sm:flex-col sm:items-end gap-0.5">
                <span className="text-xs font-bold text-white leading-tight">
                  {roleMeta.plainTitle}
                </span>
                <TermTooltip term={roleMeta.term} showIcon={false} className="text-xs" />
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="Log Out of Department"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-300 border-l border-slate-700 pl-3 font-medium">
              Not Signed In
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
