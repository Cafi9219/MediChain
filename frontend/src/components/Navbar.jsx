import React from 'react';
import { ShieldCheck, Activity, Users, LogOut, Blocks, Hospital } from 'lucide-react';

export default function Navbar({
  currentDept,
  onLogout,
  onOpenDoctors,
  onOpenExplorer,
  blockHeight = 1
}) {
  return (
    <header className="bg-gradient-to-r from-blue-900 via-sky-900 to-slate-900 text-white shadow-lg sticky top-0 z-40">
      {/* Top emergency strip */}
      <div className="bg-slate-950/80 px-4 py-1 text-xs border-b border-blue-800/40 flex justify-between items-center text-slate-300">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            CONSORTIUM NETWORK ONLINE
          </span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-slate-300">
            National Organ & Tissue Transplant Registry • SOTTO / NOTTO Protocol 2026
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-amber-300 font-mono font-medium">
            24/7 Helpline: 1800-22-67426 (ORGAN)
          </span>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-md text-white font-bold text-xl ring-2 ring-white/20">
            🫀
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                MediChain
                <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono">
                  Consortium v2.6
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-300 font-light hidden sm:block">
              Blockchain-Based Secure Traceability & Multi-Sig Verification System
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-3">
          {/* Live Block Height Badge */}
          <button
            onClick={onOpenExplorer}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer shadow-sm group"
            title="Inspect Distributed Consortium Ledger"
          >
            <Blocks className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <div className="text-left font-mono">
              <span className="text-slate-400 text-[10px] block leading-none">BLOCK HEIGHT</span>
              <span className="text-emerald-400 font-bold leading-none">#{blockHeight}</span>
            </div>
          </button>

          {/* 9 Doctors Roster Button */}
          <button
            onClick={onOpenDoctors}
            className="flex items-center gap-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-blue-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">The 9 Specialists</span>
          </button>

          {/* Logged in Department Badge or Login prompt */}
          {currentDept ? (
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-white block leading-tight">
                  {currentDept.badge}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {currentDept.id}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                title="Log Out of Department"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400 border-l border-slate-700 pl-3">
              Not Signed In
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
