import React, { useState } from 'react';
import {
  Building2,
  FileCheck2,
  HeartPulse,
  ShieldCheck,
  Hospital,
  ArrowRight,
  ExternalLink,
  Lock,
  Smartphone,
  AlertTriangle,
  Blocks,
  FileText,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';

export default function VtopLanding({ onSelectDepartment, onOpenExplorer, onOpenDoctors, blockHeight }) {
  const [showExternalWarning, setShowExternalWarning] = useState(false);

  const departments = [
    {
      id: 'DEPT_CIFV',
      role: 'CIFV',
      title: 'Cadaveric Intake Wing',
      subtitle: 'Body Collecting & Verification Department',
      abbr: 'CIFV',
      icon: '🏥',
      color: 'border-cyan-500 hover:border-cyan-600',
      badgeColor: 'bg-cyan-100 text-cyan-800',
      btnColor: 'bg-cyan-600 hover:bg-cyan-700',
      description: 'Forensic autopsy, donor demographics, biometric & legal consent verification'
    },
    {
      id: 'DEPT_SROPS',
      role: 'SROPS',
      title: 'Surgical Retrieval Suite',
      subtitle: 'Organ Extraction & Maintain Department',
      abbr: 'SROPS',
      icon: '🫀',
      color: 'border-amber-500 hover:border-amber-600',
      badgeColor: 'bg-amber-100 text-amber-800',
      btnColor: 'bg-amber-600 hover:bg-amber-700',
      description: 'Surgical organ recovery, dynamic viability scoring, perfusion & algorithmic tracking'
    },
    {
      id: 'DEPT_ADMIN',
      role: 'ADMIN',
      title: 'Central Regulatory Board',
      subtitle: 'State Transplant Oversight (Admin)',
      abbr: 'CTORB',
      icon: '🏛️',
      color: 'border-emerald-500 hover:border-emerald-600',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
      description: 'Consortium master audit, doctor credentials, inventory metrics & chain verification'
    },
    {
      id: 'DEPT_EXTERNAL',
      role: 'EXTERNAL',
      title: 'Recipient Hospital Network',
      subtitle: 'External Hospital (Phase 2)',
      abbr: 'RTCN',
      icon: '🚑',
      color: 'border-blue-400 hover:border-blue-500',
      badgeColor: 'bg-blue-100 text-blue-800',
      btnColor: 'bg-slate-700 hover:bg-slate-800',
      description: 'Registered transplant centers awaiting organ allocation (Access restricted to consortium)',
      isRestricted: true
    }
  ];

  const spotlightNotices = [
    {
      title: 'MANDATORY 2-OUT-OF-3 MULTI-SIGNATURE CLEARANCE PROTOCOL (2026)',
      isNew: true
    },
    {
      title: 'GREEN CORRIDOR FAST-TRACK AIR/ROAD LOGISTICS STANDARD OPERATING PROCEDURE',
      isNew: true
    },
    {
      title: 'HYPOTHERMIC COLD ISCHEMIA TOLERANCE AND STORAGE BENCHMARKS',
      isNew: false
    },
    {
      title: 'CONSORTIUM BLOCKCHAIN ENFORCEMENT & IMMUTABLE LEDGER REGISTRATION RULES',
      isNew: false
    },
    {
      title: 'FORENSIC BIOMETRIC DATA RETENTION GUIDELINES FOR MEDICO-LEGAL CADAVERS',
      isNew: false
    }
  ];

  return (
    <div className="min-h-[calc(100vh-100px)] bg-slate-100 flex flex-col justify-between">
      <main className="max-w-7xl mx-auto px-4 py-8 w-full space-y-8">
        {/* Hero Title Section - VTOP Styled */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Consortium Healthcare Portal
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-blue-900 tracking-tight">
            MediChain translates to "Trust on Chain"
          </h2>
          <p className="text-sm md:text-base text-slate-600 max-w-3xl mx-auto leading-relaxed">
            A digital initiative by the National Organ and Tissue Transplant Authority facilitating 
            Forensic Intake, Surgical Retrieval, Central Regulatory Oversight, and Recipient Networks 
            at one common distributed blockchain platform.
          </p>
        </div>

        {/* 4 Login Department Cards (Recreating VTOP 4-Card Layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {departments.map(dept => (
            <div
              key={dept.id}
              className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border-t-4 ${dept.color} flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl p-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-110 transition-transform">
                    {dept.icon}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dept.badgeColor}`}>
                    {dept.abbr}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {dept.title}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {dept.subtitle}
                </p>
                <p className="text-xs text-slate-600 mt-2.5 line-clamp-3 leading-relaxed">
                  {dept.description}
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100">
                {dept.isRestricted ? (
                  <button
                    onClick={() => setShowExternalWarning(true)}
                    className="w-full py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>External Hospital Login</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectDepartment(dept)}
                    className={`w-full py-2 px-3 ${dept.btnColor} text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer`}
                  >
                    <span>Login</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section: Spotlight (Left) and Mobile App / Dispatch (Right) - Matching VTOP Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Spotlight Card (VTOP Maroon/Red Border Aesthetic) */}
          <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider">
                  Spotlight & Live Bulletins
                </h3>
              </div>
              <span className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer">
                More ...
              </span>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {spotlightNotices.map((notice, idx) => (
                <div
                  key={idx}
                  className="py-2.5 flex items-start gap-2.5 group cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors"
                >
                  <span className="text-rose-500 font-bold text-xs mt-0.5">⚡</span>
                  <p className="text-xs font-medium text-slate-700 group-hover:text-blue-700 transition-colors flex-1">
                    {notice.title}
                  </p>
                  {notice.isNew && (
                    <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded shrink-0">
                      New
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: App Downloads & Emergency Fast-Track */}
          <div className="lg:col-span-4 space-y-4">
            {/* Quick App Downloads */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                Mobile Rapid Dispatch
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {/* Simulated Google Play Button */}
                <div className="bg-black text-white p-2.5 rounded-xl flex items-center gap-2 shadow hover:bg-slate-800 transition-colors cursor-pointer">
                  <div className="text-lg">▶</div>
                  <div className="text-left">
                    <span className="text-[8px] uppercase tracking-tighter text-slate-400 block leading-none">
                      GET IT ON
                    </span>
                    <span className="text-[11px] font-bold leading-none block mt-0.5">
                      Google Play
                    </span>
                  </div>
                </div>

                {/* Simulated App Store Button */}
                <div className="bg-black text-white p-2.5 rounded-xl flex items-center gap-2 shadow hover:bg-slate-800 transition-colors cursor-pointer">
                  <div className="text-lg"></div>
                  <div className="text-left">
                    <span className="text-[8px] uppercase tracking-tighter text-slate-400 block leading-none">
                      Download on the
                    </span>
                    <span className="text-[11px] font-bold leading-none block mt-0.5">
                      App Store
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-snug">
                Authorized field couriers, pilots and retrieval ambulances can sync real-time GPS cold-chain data.
              </p>
            </div>

            {/* Quick Action: Explorer & Personnel */}
            <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono text-cyan-400">Consortium Node</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">
                  Chain #{blockHeight}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">
                Distributed Consensus Explorer
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Inspect live blocks, cryptographic hashes, Merkle trees, and multi-signature transactions.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onOpenExplorer}
                  className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  <Blocks className="w-3.5 h-3.5" />
                  View Ledger
                </button>
                <button
                  onClick={onOpenDoctors}
                  className="py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-xs transition-colors"
                >
                  The 9 Doctors
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* External Hospital Restriction Dialog (Phase 2) */}
      {showExternalWarning && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Consortium Access Restricted
              </h3>
              <p className="text-xs font-semibold text-amber-700 mt-1">
                Phase 2 Deployment • Recipient Transplant Center Network (RTCN)
              </p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed text-left bg-slate-50 p-3 rounded-xl border border-slate-200">
                In strict accordance with consortium security protocols, external recipient hospitals 
                are isolated from direct read/write access to cadaveric forensic records and pre-allocation data. 
                External hospitals will interface via secure cryptographically-signed allocation tokens in Phase 2.
              </p>
            </div>
            <button
              onClick={() => setShowExternalWarning(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* VTOP Inspired Footer */}
      <footer className="bg-gradient-to-r from-blue-900 via-sky-900 to-slate-900 text-slate-300 py-3 text-center text-xs border-t border-blue-800">
        <p className="font-light">
          Copyright © 2026 Software Development Cell, National Organ & Tissue Transplant Organization (NOTTO / SOTTO). All rights reserved.
        </p>
      </footer>
    </div>
  );
}
